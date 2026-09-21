# Copyright: (c) OpenSpug Organization. https://github.com/openspug/spug
# Copyright: (c) <spug.dev@gmail.com>
# Released under the AGPL-3.0 License.
from apps.app.models import App, Deploy
from apps.deploy.models import DeployRequest
from apps.host.models import Host
from apps.schedule.models import Task
from apps.monitor.models import Detection
from apps.alarm.models import Alarm
from apps.account.utils import get_host_perms
from libs.utils import json_response, human_date, parse_time
from libs.parser import JsonParser, Argument
from libs.decorators import auth
from datetime import datetime, timedelta
import json


@auth('dashboard.dashboard.view')
def get_statistic(request):
    if request.user.is_supper:
        app = App.objects.count()
        host = Host.objects.count()
    else:
        deploy_perms, host_perms = request.user.deploy_perms, get_host_perms(request.user)
        app = App.objects.filter(id__in=deploy_perms['apps']).count()
        host = len(host_perms)
    data = {
        'app': app,
        'host': host,
        'task': Task.objects.count(),
        'detection': Detection.objects.count()
    }
    return json_response(data)


@auth('dashboard.dashboard.view')
def get_alarm(request):
    form, error = JsonParser(
        Argument('type', required=False),
        Argument('name', required=False)
    ).parse(request.GET, True)
    if error is None:
        if form.get('type'):
            # 前端传监控类型的原始键；报警记录落库的是中文展示名，不能拿 type_alias 直接过滤，
            # 英文界面下 type_alias 已被翻成英文，永远匹配不上
            form.type = dict(Detection.TYPES).get(form.type, form.type)
        now = datetime.now()
        # 含当天在内的最近 14 天、按日期升序；原先从昨天往前数，当天的报警要隔天才出现在图上
        data = {human_date(now - timedelta(days=x)): 0 for x in range(13, -1, -1)}
        for alarm in Alarm.objects.filter(status='1', created_at__gte=min(data), **form):
            date = alarm.created_at[:10]
            if date in data:
                data[date] += 1
        data = [{'date': k, 'value': v} for k, v in data.items()]
        return json_response(data)
    return json_response(error=error)


@auth('dashboard.dashboard.view')
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
        data = sorted(data.values(), key=lambda x: x['count'], reverse=True)[:20]
        return json_response(data)
    return json_response(error=error)


@auth('dashboard.dashboard.view')
def get_deploy(request):
    host = Host.objects.count()
    data = {x.id: {'name': x.name, 'count': 0} for x in App.objects.all()}
    for dep in Deploy.objects.all():
        data[dep.app_id]['count'] += len(json.loads(dep.host_ids))
    data = filter(lambda x: x['count'], data.values())
    return json_response({'host': host, 'res': list(data)})
