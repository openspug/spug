# Copyright: (c) OpenSpug Organization. https://github.com/openspug/spug
# Copyright: (c) <spug.dev@gmail.com>
# Released under the AGPL-3.0 License.
from django.views.generic import View
from django_redis import get_redis_connection
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
from apps.schedule.scheduler import Scheduler
from apps.schedule.models import Task, History
from apps.schedule.executors import local_executor, host_executor
from apps.host.models import Host
from django.conf import settings
from libs import json_response, JsonParser, Argument, human_datetime, auth
import json


class Schedule(View):
    @auth('schedule.schedule.view')
    def get(self, request):
        tasks = Task.objects.all()
        types = [x['type'] for x in tasks.order_by('type').values('type').distinct()]
        return json_response({'types': types, 'tasks': [x.to_dict() for x in tasks]})

    @auth('schedule.schedule.add|schedule.schedule.edit')
    def post(self, request):
        form, error = JsonParser(
            Argument('id', type=int, required=False),
            Argument('type', help='请输入任务类型'),
            Argument('name', help='请输入任务名称'),
            Argument('command', help='请输入任务内容'),
            Argument('rst_notify', type=dict, help='请选择执行失败通知方式'),
            Argument('targets', type=list, filter=lambda x: len(x), help='请选择执行对象'),
            Argument('trigger', filter=lambda x: x in dict(Task.TRIGGERS), help='请选择触发器类型'),
            Argument('trigger_args', help='请输入触发器参数'),
            Argument('desc', required=False),
        ).parse(request.body)
        if error is None:
            form.targets = json.dumps(form.targets)
            form.rst_notify = json.dumps(form.rst_notify)
            if form.trigger == 'cron':
                args = json.loads(form.trigger_args)['rule'].split()
                if len(args) != 5:
                    return json_response(error='无效的执行规则，请更正后再试')
                minute, hour, day, month, week = args
                week = '0' if week == '7' else week
                try:
                    CronTrigger(minute=minute, hour=hour, day=day, month=month, day_of_week=week)
                except ValueError:
                    return json_response(error='无效的执行规则，请更正后再试')
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
                    rds_cli.lpush(settings.SCHEDULE_KEY, json.dumps(form))
            else:
                Task.objects.create(created_by=request.user, **form)
        return json_response(error=error)

    @auth('schedule.schedule.edit')
    def patch(self, request):
        form, error = JsonParser(
            Argument('id', type=int, help='请指定操作对象'),
            Argument('is_active', type=bool, required=False)
        ).parse(request.body, True)
        if error is None:
            task = Task.objects.get(pk=form.id)
            if form.get('is_active') is not None:
                task.is_active = form.is_active
                task.latest_id = None
                if form.is_active:
                    message = {'id': form.id, 'action': 'add'}
                    message.update(task.to_dict(selects=('trigger', 'trigger_args', 'command', 'targets')))
                else:
                    message = {'id': form.id, 'action': 'remove'}
                rds_cli = get_redis_connection()
                rds_cli.lpush(settings.SCHEDULE_KEY, json.dumps(message))
            task.save()
        return json_response(error=error)

    @auth('schedule.schedule.del')
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
                History.objects.filter(task_id=task.id).delete()
        return json_response(error=error)


class HistoryView(View):
    @auth('schedule.schedule.view')
    def get(self, request, t_id):
        task = Task.objects.filter(pk=t_id).first()
        if not task:
            return json_response(error='未找到指定任务')

        h_id = request.GET.get('id')
        if h_id:
            h_id = task.latest_id if h_id == 'latest' else h_id
            return json_response(self._fetch_detail(h_id))
        histories = History.objects.filter(task_id=t_id)
        return json_response([x.to_list() for x in histories])

    @auth('schedule.schedule.edit')
    def post(self, request, t_id):
        task = Task.objects.filter(pk=t_id).first()
        if not task:
            return json_response(error='未找到指定任务')
        outputs, status = {}, 1
        for host_id in json.loads(task.targets):
            if host_id == 'local':
                code, duration, out = local_executor(task.command)
            else:
                host = Host.objects.filter(pk=host_id).first()
                if not host:
                    code, duration, out = 1, 0, f'unknown host id for {host_id!r}'
                else:
                    code, duration, out = host_executor(host, task.command)
            if code != 0:
                status = 2
            outputs[host_id] = [code, duration, out]

        history = History.objects.create(
            task_id=task.id,
            status=status,
            run_time=human_datetime(),
            output=json.dumps(outputs)
        )
        return json_response(history.id)

    def _fetch_detail(self, h_id):
        record = History.objects.filter(pk=h_id).first()
        outputs = json.loads(record.output)
        host_ids = (x for x in outputs.keys() if x != 'local')
        hosts_info = {str(x.id): x.name for x in Host.objects.filter(id__in=host_ids)}
        data = {'run_time': record.run_time, 'success': 0, 'failure': 0, 'duration': 0, 'outputs': []}
        for host_id, value in outputs.items():
            if not value:
                continue
            code, duration, out = value
            key = 'success' if code == 0 else 'failure'
            data[key] += 1
            data['duration'] += duration
            data['outputs'].append({
                'name': hosts_info.get(host_id, '本机'),
                'code': code,
                'duration': duration,
                'output': out})
        data['duration'] = f"{data['duration'] / len(outputs):.3f}"
        return data


@auth('schedule.schedule.view|schedule.schedule.add|schedule.schedule.edit')
def next_run_time(request):
    form, error = JsonParser(
        Argument('rule', help='参数错误'),
        Argument('start', required=False),
        Argument('stop', required=False)
    ).parse(request.body)
    if error is None:
        try:
            minute, hour, day, month, week = form.rule.split()
            week = Scheduler.covert_week(week)
            trigger = CronTrigger(minute=minute, hour=hour, day=day, month=month, day_of_week=week,
                                  start_date=form.start, end_date=form.stop)
        except (ValueError, KeyError):
            return json_response({'success': False, 'msg': '无效的执行规则'})
        scheduler = BackgroundScheduler(timezone=settings.TIME_ZONE)
        scheduler.start()
        job = scheduler.add_job(lambda: None, trigger)
        run_time = job.next_run_time
        scheduler.shutdown()
        if run_time:
            return json_response({'success': True, 'msg': run_time.strftime('%Y-%m-%d %H:%M:%S')})
        else:
            return json_response({'success': False, 'msg': '无法被触发'})
    return json_response(error=error)
