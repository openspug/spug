# Copyright: (c) OpenSpug Organization. https://github.com/openspug/spug
# Copyright: (c) <spug.dev@gmail.com>
# Released under the AGPL-3.0 License.
from libs.ssh import AuthenticationException
from django.db import close_old_connections, transaction
from apps.host.models import Host
from apps.schedule.models import History, Task
from apps.schedule.analysis import analyze_history
from apps.schedule.utils import send_analysis_notify, send_fail_notify
from libs.utils import wrap_python_command
import subprocess
import socket
import time
import json

# Paramiko 的 recv_exit_status() 在通道关闭却没收到 exit-status 报文时返回 -1。
# 它表示「退出状态未知」（连接中断、命令被切断等），而不是命令自己报告了失败，
# 因此必须与真实的非零退出码区分开，否则输出完整的任务会被误判为失败。
EXIT_UNKNOWN = -1


def resolve_status(outputs):
    """根据各执行对象的退出码计算历史状态。

    1=成功，2=失败，3=已中断（退出状态未知）。
    真实失败优先于中断：只要有目标明确报告了非零退出码，整体即判定为失败。
    """
    codes = [value[0] for value in outputs.values() if value]
    if any(code not in (0, EXIT_UNKNOWN) for code in codes):
        return 2
    if any(code == EXIT_UNKNOWN for code in codes):
        return 3
    return 1


def local_executor(command):
    code, out, now = 1, None, time.time()
    task = subprocess.Popen(command, shell=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    try:
        code = task.wait(3600)
        out = task.stdout.read() + task.stderr.read()
        out = out.decode()
    except subprocess.TimeoutExpired:
        out = 'timeout, wait more than 1 hour'
    return code, round(time.time() - now, 3), out


def host_executor(host, command):
    code, out, now = 1, None, time.time()
    try:
        with host.get_ssh() as ssh:
            code, out = ssh.exec_command_raw(command)
    except AuthenticationException:
        out = 'ssh authentication fail'
    except socket.error as e:
        out = f'network error {e}'
    if code == EXIT_UNKNOWN:
        # 退出状态缺失通常意味着命令被切断（例如 docker logs -f 这类不会自行退出的命令）。
        # 输出可能是完整的，这里显式说明，避免用户看到「失败」却找不到失败原因。
        out = (out or '') + (
            '\n\n[Spug] 连接已结束但未收到命令退出状态，'
            '执行结果可能不完整。常见于不会自行退出的命令（如 docker logs -f、tail -f）。')
    return code, round(time.time() - now, 3), out


def dispatch_job(host_id, interpreter, command):
    if interpreter == 'python':
        command = wrap_python_command(command)
    if host_id == 'local':
        code, duration, out = local_executor(command)
    else:
        host = Host.objects.filter(pk=host_id).first()
        if not host:
            code, duration, out = 1, 0, f'unknown host id for {host_id!r}'
        else:
            code, duration, out = host_executor(host, command)
    return code, duration, out


def _finish_history(task, history, outputs):
    if task.ai_analysis:
        result = analyze_history(task, outputs)
        History.objects.filter(pk=history.id).update(
            ai_status=result['status'], ai_summary=result['summary'], ai_model=result['model'])
        send_analysis_notify(
            task, history.status == 1, result['summary'], analysis_ok=result['status'] == 'success')
    elif history.status != 1:
        send_fail_notify(task)


def schedule_worker_handler(job):
    history_id, host_id, interpreter, command = json.loads(job)
    code, duration, out = dispatch_job(host_id, interpreter, command)

    close_old_connections()
    completed = False
    with transaction.atomic():
        history = History.objects.select_for_update().get(pk=history_id)
        output = json.loads(history.output)
        output[str(host_id)] = [code, duration, out]
        history.output = json.dumps(output)
        if history.status == 0 and all(output.values()):
            history.status = resolve_status(output)
            completed = True
        history.save()
    if completed:
        task = Task.objects.get(pk=history.task_id)
        _finish_history(task, history, output)
