# Copyright: (c) OpenSpug Organization. https://github.com/openspug/spug
# Copyright: (c) <spug.dev@gmail.com>
# Released under the AGPL-3.0 License.
from django.views.generic import View
from django.conf import settings
from django_redis import get_redis_connection
from libs import json_response, JsonParser, Argument, human_datetime, auth
from apps.monitor.models import Detection
from apps.monitor.executors import dispatch
from apps.account.utils import has_host_perm
from apps.setting.utils import AppSetting
from datetime import datetime
import json


def _verify_host_targets(user, tp, targets, extra):
    # 进程检测(3)和自定义脚本(4)会经 SSH 在被管主机上执行，必须与批量执行一样校验主机权限，
    # 否则只有监控页面权限的用户也能在任意主机上执行命令
    if tp not in ('3', '4'):
        return None
    if tp == '3' and not extra:
        return '请输入进程名称'
    try:
        host_ids = [int(x) for x in targets]
    except (TypeError, ValueError):
        return '请选择监控主机'
    if not has_host_perm(user, host_ids):
        return '无权访问主机，请联系管理员'
    return None


class DetectionView(View):
    @auth('dashboard.dashboard.view|monitor.monitor.view')
    def get(self, request):
        detections = Detection.objects.all()
        groups = [x['group'] for x in detections.order_by('group').values('group').distinct()]
        return json_response({'groups': groups, 'detections': [x.to_view() for x in detections]})

    @auth('monitor.monitor.add|monitor.monitor.edit')
    def post(self, request):
        form, error = JsonParser(
            Argument('id', type=int, required=False),
            Argument('name', help='请输入任务名称'),
            Argument('group', help='请选择任务分组'),
            Argument('targets', type=list, filter=lambda x: len(x), help='请输入监控地址'),
            Argument('type', filter=lambda x: x in dict(Detection.TYPES), help='请选择监控类型'),
            Argument('extra', required=False),
            Argument('desc', required=False),
            Argument('rate', type=int, default=5),
            Argument('threshold', type=int, default=3),
            Argument('quiet', type=int, default=24 * 60),
            Argument('notify_grp', type=list, help='请选择报警联系组'),
            Argument('notify_mode', type=list, help='请选择报警方式'),
        ).parse(request.body)
        if error is None:
            error = _verify_host_targets(request.user, form.type, form.targets, form.extra)
            if error:
                return json_response(error=error)
            if set(form.notify_mode).intersection(['1', '2', '4']):
                if not AppSetting.get_default('spug_key'):
                    return json_response(error='报警方式 微信、短信、邮件需要配置调用凭据（系统设置/基本设置），请配置后再启用该报警方式。')

            form.targets = json.dumps(form.targets)
            form.notify_grp = json.dumps(form.notify_grp)
            form.notify_mode = json.dumps(form.notify_mode)
            if form.id:
                Detection.objects.filter(pk=form.id).update(
                    updated_at=human_datetime(),
                    updated_by=request.user,
                    **form)
                task = Detection.objects.filter(pk=form.id).first()
                if task and task.is_active:
                    form.action = 'modify'
                    rds_cli = get_redis_connection()
                    rds_cli.lpush(settings.MONITOR_KEY, json.dumps(form))
            else:
                dtt = Detection.objects.create(created_by=request.user, **form)
                form.action = 'add'
                form.id = dtt.id
                rds_cli = get_redis_connection()
                rds_cli.lpush(settings.MONITOR_KEY, json.dumps(form))
        return json_response(error=error)

    @auth('monitor.monitor.edit')
    def patch(self, request):
        form, error = JsonParser(
            Argument('id', type=int, help='请指定操作对象'),
            Argument('is_active', type=bool, required=False)
        ).parse(request.body, True)
        if error is None:
            task = Detection.objects.filter(pk=form.id).first()
            if not task:
                return json_response(error='未找到指定监控项')
            if form.get('is_active'):
                error = _verify_host_targets(request.user, task.type, json.loads(task.targets), task.extra)
                if error:
                    return json_response(error=error)
            Detection.objects.filter(pk=form.id).update(**form)
            if form.get('is_active') is not None:
                if form.is_active:
                    task.refresh_from_db()
                    message = {'id': form.id, 'action': 'add'}
                    message.update(task.to_dict(selects=('targets', 'extra', 'rate', 'type', 'threshold', 'quiet')))
                else:
                    message = {'id': form.id, 'action': 'remove'}
                rds_cli = get_redis_connection()
                rds_cli.lpush(settings.MONITOR_KEY, json.dumps(message))
        return json_response(error=error)

    @auth('monitor.monitor.del')
    def delete(self, request):
        form, error = JsonParser(
            Argument('id', type=int, help='请指定操作对象')
        ).parse(request.GET)
        if error is None:
            task = Detection.objects.filter(pk=form.id).first()
            if task:
                if task.is_active:
                    return json_response(error='该监控项正在运行中，请先停止后再尝试删除')
                task.delete()
        return json_response(error=error)


@auth('monitor.monitor.add|monitor.monitor.edit')
def run_test(request):
    form, error = JsonParser(
        Argument('type', help='请选择监控类型'),
        Argument('targets', type=list, filter=lambda x: len(x), help='请输入监控地址'),
        Argument('extra', required=False)
    ).parse(request.body)
    if error is None:
        error = _verify_host_targets(request.user, form.type, form.targets[:1], form.extra)
        if error:
            return json_response(error=error)
        is_success, message = dispatch(form.type, form.targets[0], form.extra)
        return json_response({'is_success': is_success, 'message': message})
    return json_response(error=error)


@auth('monitor.monitor.view')
def get_overview(request):
    response = []
    rds = get_redis_connection()
    for item in Detection.objects.all():
        data = {}
        for key in json.loads(item.targets):
            key = str(key)
            data[key] = {
                'id': f'{item.id}_{key}',
                'group': item.group,
                'name': item.name,
                'type_alias': item.get_type_display(),
                'target': key,
                'desc': item.desc,
                'status': '0',
                'latest_run_time': item.latest_run_time,
            }
            if item.is_active:
                if item.latest_run_time:
                    data[key]['status'] = '1'
                else:
                    data[key]['status'] = '10'
        if item.is_active:
            for key, val in rds.hgetall(f'spug:det:{item.id}').items():
                prefix, key = key.decode().split('_', 1)
                if key in data:
                    val = int(val)
                    if prefix == 'c':
                        if data[key]['status'] == '1':
                            data[key]['status'] = '2'
                        data[key]['count'] = val
                    elif prefix == 't':
                        date = datetime.fromtimestamp(val).strftime('%Y-%m-%d %H:%M:%S')
                        data[key].update(status='3', notified_at=date)
        response.extend(list(data.values()))
    return json_response(response)
