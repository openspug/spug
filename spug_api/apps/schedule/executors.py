# Copyright: (c) OpenSpug Organization. https://github.com/openspug/spug
# Copyright: (c) <spug.dev@gmail.com>
# Released under the AGPL-3.0 License.
from libs.ssh import AuthenticationException
from django.db import close_old_connections, transaction
from apps.host.models import Host
from apps.schedule.models import History, Task
from apps.schedule.utils import send_fail_notify
import subprocess
import socket
import time
import json


def local_executor(command):
    code, out, now = 1, None, time.time()
    task = subprocess.Popen(command, shell=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    try:
        code = task.wait(3600)
        out = task.stdout.read() + task.stderr.read()
        out = out.decode()
    except subprocess.TimeoutExpired:
        # task.kill()
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
    return code, round(time.time() - now, 3), out


def schedule_worker_handler(job):
    history_id, host_id, command = json.loads(job)
    if host_id == 'local':
        code, duration, out = local_executor(command)
    else:
        host = Host.objects.filter(pk=host_id).first()
        if not host:
            code, duration, out = 1, 0, f'unknown host id for {host_id!r}'
        else:
            code, duration, out = host_executor(host, command)

    close_old_connections()
    with transaction.atomic():
        history = History.objects.select_for_update().get(pk=history_id)
        output = json.loads(history.output)
        output[str(host_id)] = [code, duration, out]
        history.output = json.dumps(output)
        if all(output.values()):
            history.status = '1' if sum(x[0] for x in output.values()) == 0 else '2'
        history.save()
    if history.status == '2':
        task = Task.objects.get(pk=history.task_id)
        send_fail_notify(task)
