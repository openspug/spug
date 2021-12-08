# Copyright: (c) OpenSpug Organization. https://github.com/openspug/spug
# Copyright: (c) <spug.dev@gmail.com>
# Released under the AGPL-3.0 License.
from django.db import close_old_connections
from apps.alarm.models import Alarm
from apps.monitor.models import Detection
from libs.spug import Notification
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
