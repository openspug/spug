# Copyright: (c) OpenSpug Organization. https://github.com/openspug/spug
# Copyright: (c) <spug.dev@gmail.com>
# Released under the AGPL-3.0 License.
from django.db import close_old_connections
from apps.alarm.models import Alarm
from apps.monitor.models import Detection, AI_LOOP_LIMITS
from apps.schedule.models import Task
from apps.schedule.scheduler import Scheduler
from libs.spug import Notification
import logging
import json


def seconds_to_human(seconds):
    text = ''
    if seconds > 3600:
        text = f'{int(seconds / 3600)}小时'
        seconds = seconds % 3600
    if seconds > 60:
        text += f'{int(seconds / 60)}分钟'
        seconds = seconds % 60
    if seconds:
        text += f'{seconds}秒'
    return text


def _record_alarm(det, target, duration, status):
    Alarm.objects.create(
        name=det.name,
        type=det.get_type_display(),
        target=target,
        status=status,
        duration=duration,
        notify_grp=det.notify_grp,
        notify_mode=det.notify_mode)


def handle_notify(task_id, target, is_ok, out, fault_times):
    close_old_connections()
    det = Detection.objects.get(pk=task_id)
    duration = seconds_to_human(det.rate * fault_times * 60)
    event = '2' if is_ok else '1'
    _record_alarm(det, target, duration, event)
    grp = json.loads(det.notify_grp)
    notify = Notification(grp, event, target, det.name, out, duration)
    notify.dispatch_monitor(json.loads(det.notify_mode))


def _resolve_max_loops(det):
    """按 AI 模式取轮次上限。

    历史任务里可能存着改限幅之前保存的值（如诊断存了 20），
    这里按当前模式再夹一次，避免诊断跑出远超预期的轮次。
    """
    ceiling, fallback = AI_LOOP_LIMITS.get(det.ai_mode, (20, 3))
    return max(1, min(det.ai_max_loops or fallback, ceiling))


def _build_trigger_message(det, target, message):
    """把监控任务的配置还原成明确的排查目标。

    只传「Connection refused」这类原始报错，模型无从得知被检测的端口/进程是什么，
    只能全服务器撒网排查，轮次很快耗尽还定位不到根因。这里把检测类型和检测参数
    一并交代清楚，让第一轮就能直奔目标。
    """
    lines = [f'原始告警：{message}', f'检测类型：{det.get_type_display()}']
    extra = (det.extra or '').strip()
    if det.type == '1':
        lines.append(f'检测地址：{target}')
        if extra:
            lines.append(f'响应时间阈值：{extra}ms')
        lines.append('排查重点：该 URL 为何无法正常访问（服务未启动、端口未监听、返回异常状态码或响应超时）。')
    elif det.type == '2':
        lines.append(f'检测目标：{target} 的 TCP 端口 {extra}')
        lines.append(f'排查重点：请优先确认 {extra} 端口是否处于监听状态、'
                     f'本应监听该端口的服务（含 Docker 容器）是否已退出或启动失败。'
                     f'与该端口无关的组件不必深入排查。')
    elif det.type == '3':
        lines.append(f'检测目标：进程关键字 {extra!r}')
        lines.append(f'排查重点：匹配 {extra!r} 的进程为何不存在，以及它退出或启动失败的原因。')
    elif det.type == '4':
        lines.append(f'检测方式：自定义脚本，脚本内容如下\n{extra}')
        lines.append('排查重点：该脚本为何返回非 0 退出码。')
    elif det.type == '5':
        lines.append(f'检测目标：Ping {target}')
        lines.append('排查重点：该地址为何 Ping 不通（网卡、路由、防火墙）。')
    return '\n'.join(lines)


def handle_ai_post_task(task_id, target, message, fault_times, verifier=None):
    """告警后置任务：原始告警已经发出，这里由智能体处理并追加第二条通知。

    通知分两次发送：
      1. 达到阈值时立刻发原始告警（由调用方的 handle_notify 完成），
         保证故障第一时间可见，不会被 AI 的处理耗时压住；
      2. 智能体处理结束后，再发一条带结论的通知（诊断结论 / 修复结果）。

    返回值：
      None        —— 未启用 AI，无追加通知
      'alarm'     —— 已追加发出结论通知（诊断结论，或修复未成功）
      'recovered' —— 修复成功并已发出恢复通知，调用方需清理故障计数，
                     否则下一次探测正常时会再发一条重复的恢复通知
    """
    close_old_connections()
    det = Detection.objects.filter(pk=task_id).first()
    if not det or det.ai_mode not in ('diagnose', 'repair') or not det.ai_host_id:
        return None

    # 延迟导入避免 monitor 模块加载期与 ai 模块产生循环依赖
    from apps.ai.models import AgentSession
    from apps.ai.agent import run_session

    mode_alias = 'AI诊断' if det.ai_mode == 'diagnose' else 'AI修复'
    session = AgentSession.objects.create(
        title=f'{mode_alias}：{det.name}',
        source='monitor',
        mode=det.ai_mode,
        host_id=det.ai_host_id,
        detection_id=det.id,
        target=target,
        trigger_message=_build_trigger_message(det, target, message),
        max_loops=_resolve_max_loops(det))
    try:
        session = run_session(session, verifier if det.ai_mode == 'repair' else None)
    except Exception as e:
        logging.exception('ai pre task failed')
        session.status = 'error'
        session.summary = f'执行异常：{e}'
        session.save(update_fields=['status', 'summary'])

    close_old_connections()
    det = Detection.objects.get(pk=det.id)
    recovered = det.ai_mode == 'repair' and session.status == 'success'
    if recovered:
        title, event = f'{det.name}[{mode_alias}已恢复]', '2'
    elif det.ai_mode == 'repair':
        title, event = f'{det.name}[{mode_alias}未成功]', '1'
    else:
        title, event = f'{det.name}[{mode_alias}结论]', '1'
    body = [
        f'（本条为前一条告警的{mode_alias}结果）',
        f'原始告警：{message}',
        f'处理模式：{mode_alias}（第 {session.used_loops}/{session.max_loops} 轮结束）',
        f'处理结果：{session.get_status_display()}',
        f'会话编号：#{session.id}（可在智能体模块查看完整执行记录）',
        '',
        session.summary or '未获取到分析结论',
    ]
    duration = seconds_to_human(det.rate * max(fault_times, 1) * 60)
    # 故障本身已由原始告警记过一次，这里只在状态真正发生变化（已恢复）时补记，
    # 否则报警历史里会出现两条内容重复的故障记录
    if recovered:
        _record_alarm(det, target, duration, event)
    grp = json.loads(det.notify_grp)
    notify = Notification(grp, event, target, title, '\n'.join(body), duration)
    notify.dispatch_monitor(json.loads(det.notify_mode))
    return 'recovered' if recovered else 'alarm'


def handle_trigger_event(task_id, target):
    query = dict(is_active=True, trigger='monitor', trigger_args__regex=fr'[^0-9]{task_id}[^0-9]')
    for item in Task.objects.filter(**query):
        targets = []
        for t in json.loads(item.targets):
            if t == 'monitor':
                if target:
                    targets.append(target)
            else:
                targets.append(t)
        if targets:
            Scheduler.dispatch(item.id, item.interpreter, item.command, targets)
