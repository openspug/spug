# Copyright: (c) OpenSpug Organization. https://github.com/openspug/spug
# Copyright: (c) <spug.dev@gmail.com>
# Released under the MIT License.
from django.views.generic import View
from django_redis import get_redis_connection
from apps.schedule.models import Task
from apps.host.models import Host
from django.conf import settings
from libs import json_response, JsonParser, Argument, human_datetime
import json


class Schedule(View):
    def get(self, request):
        tasks = Task.objects.all()
        types = [x['type'] for x in tasks.order_by('type').values('type').distinct()]
        return json_response({'types': types, 'tasks': [x.to_dict() for x in tasks]})

    def post(self, request):
        form, error = JsonParser(
            Argument('id', type=int, required=False),
            Argument('type', help='请输入任务类型'),
            Argument('name', help='请输入任务名称'),
            Argument('command', help='请输入任务内容'),
            Argument('targets', type=list, filter=lambda x: len(x), help='请选择执行对象'),
            Argument('trigger', filter=lambda x: x in dict(Task.TRIGGERS), help='请选择触发器类型'),
            Argument('trigger_args', help='请输入触发器参数'),
            Argument('desc', required=False),
        ).parse(request.body)
        if error is None:
            form.targets = json.dumps(form.targets)
            if form.id:
                Task.objects.filter(pk=form.id).update(
                    updated_at=human_datetime(),
                    updated_by=request.user,
                    **form
                )
                task = Task.objects.filter(pk=form.id).first()
                if task and task.is_active:
                    form.action = 'modify'
                    form.targets = json.loads(form.targets)
                    rds_cli = get_redis_connection()
                    rds_cli.rpush(settings.SCHEDULE_KEY, json.dumps(form))
            else:
                Task.objects.create(created_by=request.user, **form)
        return json_response(error=error)

    def patch(self, request):
        form, error = JsonParser(
            Argument('id', type=int, help='请指定操作对象'),
            Argument('is_active', type=bool, required=False)
        ).parse(request.body, True)
        if error is None:
            Task.objects.filter(pk=form.id).update(**form)
            if form.get('is_active') is not None:
                if form.is_active:
                    task = Task.objects.filter(pk=form.id).first()
                    message = {'id': form.id, 'action': 'add'}
                    message.update(task.to_dict(selects=('trigger', 'trigger_args', 'command', 'targets')))
                else:
                    message = {'id': form.id, 'action': 'remove'}
                rds_cli = get_redis_connection()
                rds_cli.rpush(settings.SCHEDULE_KEY, json.dumps(message))
        return json_response(error=error)

    def delete(self, request):
        form, error = JsonParser(
            Argument('id', type=int, help='请指定操作对象')
        ).parse(request.GET)
        if error is None:
            task = Task.objects.filter(pk=form.id).first()
            if task:
                if task.is_active:
                    return json_response(error='该任务在运行中，请先停止任务再尝试删除')
                task.delete()
        return json_response(error=error)


class ScheduleInfo(View):
    def get(self, request, t_id):
        task = Task.objects.filter(pk=t_id).first()
        outputs = json.loads(task.latest_output)
        host_ids = (x[0] for x in outputs if isinstance(x[0], int))
        hosts_info = {x.id: x.name for x in Host.objects.filter(id__in=host_ids)}
        data = {'run_time': task.latest_run_time, 'success': 0, 'failure': 0, 'duration': 0, 'outputs': []}
        for h_id, code, duration, out in outputs:
            key = 'success' if code == 0 else 'failure'
            data[key] += 1
            data['duration'] += duration
            data['outputs'].append({
                'name': hosts_info.get(h_id, '本机'),
                'code': code,
                'duration': duration,
                'output': out})
        data['duration'] = f"{data['duration'] / len(outputs):.3f}"
        return json_response(data)
