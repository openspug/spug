# Copyright: (c) OpenSpug Organization. https://github.com/openspug/spug
# Copyright: (c) <spug.dev@gmail.com>
# Released under the AGPL-3.0 License.
from django.db import close_old_connections
from apps.alarm.models import Alarm
from apps.monitor.models import Detection
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


def handle_ai_pre_task(task_id, target, message, verifier=None):
    """告警前置任务：由智能体诊断或修复，并以其结果替代原始告警通知。

    返回 True 表示已由 AI 接管（原始告警不再发送），False 表示走原有告警流程。
    """
    close_old_connections()
    det = Detection.objects.filter(pk=task_id).first()
    if not det or det.ai_mode not in ('diagnose', 'repair') or not det.ai_host_id:
        return False

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
        trigger_message=message,
        max_loops=max(1, min(det.ai_max_loops or 3, 20)))
    try:
        session = run_session(session, verifier if det.ai_mode == 'repair' else None)
    except Exception as e:
        logging.exception('ai pre task failed')
        session.status = 'error'
        session.summary = f'执行异常：{e}'
        session.save(update_fields=['status', 'summary'])

    close_old_connections()
    det = Detection.objects.get(pk=det.id)
    if det.ai_mode == 'repair' and session.status == 'success':
        title, event = f'{det.name}[{mode_alias}已恢复]', '2'
    else:
        title, event = f'{det.name}[{mode_alias}]', '1'
    body = [
        f'原始告警：{message}',
        f'处理模式：{mode_alias}（第 {session.used_loops}/{session.max_loops} 轮结束）',
        f'处理结果：{session.get_status_display()}',
        f'会话编号：#{session.id}（可在智能体模块查看完整执行记录）',
        '',
        session.summary or '未获取到分析结论',
    ]
    duration = seconds_to_human(det.rate * det.threshold * 60)
    _record_alarm(det, target, duration, event)
    grp = json.loads(det.notify_grp)
    notify = Notification(grp, event, target, title, '\n'.join(body), duration)
    notify.dispatch_monitor(json.loads(det.notify_mode))
    return True


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
