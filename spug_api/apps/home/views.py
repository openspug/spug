# Copyright: (c) OpenSpug Organization. https://github.com/openspug/spug
# Copyright: (c) <spug.dev@gmail.com>
# Released under the AGPL-3.0 License.
from django.db.models import F
from apps.app.models import App
from apps.host.models import Host
from apps.schedule.models import Task
from apps.monitor.models import Detection
from apps.alarm.models import Alarm
from apps.deploy.models import Deploy, DeployRequest
from libs.utils import json_response, human_date, parse_time
from libs.parser import JsonParser, Argument
from datetime import datetime, timedelta
import json


def get_statistic(request):
    data = {
        'app': App.objects.count(),
        'host': Host.objects.filter(deleted_at__isnull=True).count(),
        'task': Task.objects.count(),
        'detection': Detection.objects.count()
    }
    return json_response(data)


def get_alarm(request):
    now = datetime.now()
    data = {human_date(now - timedelta(days=x + 1)): 0 for x in range(14)}
    for alarm in Alarm.objects.filter(status='1', created_at__gt=human_date(now - timedelta(days=14))):
        date = alarm.created_at[:10]
        if date in data:
            data[date] += 1
    data = [{'date': k, 'value': v} for k, v in data.items()]
    return json_response(data)


def get_request(request):
    form, error = JsonParser(
        Argument('duration', type=list, help='参数错误')
    ).parse(request.body)
    if error is None:
        s_date = form.duration[0]
        e_date = (parse_time(form.duration[1]) + timedelta(days=1)).strftime('%Y-%m-%d')
        data = {x.id: {'name': x.name, 'count': 0} for x in App.objects.all()}
        for req in DeployRequest.objects.filter(created_at__gt=s_date, created_at__lt=e_date):
            data[req.deploy.app_id]['count'] += 1
        data = sorted(data.values(), key=lambda x: x['count'], reverse=True)[:10]
        return json_response(data)
    return json_response(error=error)


def get_deploy(request):
    host = Host.objects.filter(deleted_at__isnull=True).count()
    data = {x.id: {'name': x.name, 'count': 0} for x in App.objects.all()}
    for dep in Deploy.objects.all():
        data[dep.app_id]['count'] += len(json.loads(dep.host_ids))
    data = filter(lambda x: x['count'], data.values())
    return json_response({'host': host, 'res': list(data)})

