# Copyright: (c) OpenSpug Organization. https://github.com/openspug/spug
# Copyright: (c) <spug.dev@gmail.com>
# Released under the AGPL-3.0 License.
from django.db import close_old_connections
from apps.account.models import History
from apps.alarm.models import Alarm
from apps.schedule.models import Task
from apps.deploy.models import DeployRequest
from libs.utils import parse_time
from datetime import datetime, timedelta


def auto_run_by_day():
    close_old_connections()
    date = datetime.now() - timedelta(days=30)
    History.objects.filter(created_at__lt=date.strftime('%Y-%m-%d')).delete()
    Alarm.objects.filter(created_at__lt=date.strftime('%Y-%m-%d')).delete()
    for task in Task.objects.all():
        try:
            record = History.objects.filter(task_id=task.id)[50]
            History.objects.filter(task_id=task.id, id__lt=record.id).delete()
        except IndexError:
            pass


def auto_run_by_minute():
    now = datetime.now()
    for req in DeployRequest.objects.filter(status='2'):
        if (now - parse_time(req.do_at)).seconds > 3600:
            req.status = '-3'
            req.save()
