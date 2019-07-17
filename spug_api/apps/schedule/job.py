from flask import Blueprint, request, abort
from libs.tools import json_response, JsonParser, Argument, human_diff_time
from apps.schedule.scheduler import scheduler
from apps.schedule.models import Job
from datetime import datetime
from public import db
from libs.decorators import require_permission


blueprint = Blueprint(__name__, __name__)


@blueprint.route('/', methods=['GET'])
@require_permission('job_task_view')
def get():
    form, error = JsonParser(
        Argument('page', type=int, default=1, required=False),
        Argument('pagesize', type=int, default=10, required=False),
        Argument('job_group', type=str, required=False),).parse(request.args)

    if error is None:
        if form.job_group:
            job = Job.query.filter_by(group=form.job_group).order_by(Job.enabled.desc())
        else:
            job = Job.query.order_by(Job.enabled.desc())

        total = job.count()
        job_data = job.limit(form.pagesize).offset((form.page - 1) * form.pagesize).all()
        jobs = [x.to_json() for x in job_data]
        now = datetime.now()
        for job in jobs:
            if not job['enabled']:
                job['next_run_time'] = '未启用'
            elif str(job['id']) in scheduler.jobs:
                next_run_time = scheduler.jobs[str(job['id'])].next_run_time
                if next_run_time is None:
                    job['next_run_time'] = '已过期'
                else:
                    job['next_run_time'] = human_diff_time(next_run_time.replace(tzinfo=None), now)
            elif job['trigger'] == 'date' and now > datetime.strptime(job['trigger_args'], '%Y-%m-%d %H:%M:%S'):
                job['next_run_time'] = '已过期'
            else:
                job['next_run_time'] = '异常'
        return json_response({'data': jobs, 'total': total})
    return json_response(message=error)


@blueprint.route('/', methods=['POST'])
@require_permission('job_task_add')
def post():
    form, error = JsonParser(
        'name', 'group', 'desc', 'command_user', 'command', 'targets',
        Argument('command_user', default='root')
    ).parse()
    if error is None:
        Job(**form).save()
    return json_response(message=error)


@blueprint.route('/<int:job_id>', methods=['PUT'])
@require_permission('job_task_edit')
def put(job_id):
    form, error = JsonParser(
        'name', 'group', 'desc', 'command', 'targets',
        Argument('command_user', default='root')
    ).parse()
    if error is None:
        job = Job.query.get_or_404(job_id)
        job.update(**form)
    return json_response(message=error)


@blueprint.route('/<int:job_id>/trigger', methods=['POST'])
@require_permission('job_task_add | job_task_edit')
def set_trigger(job_id):
    form, error = JsonParser(
        Argument('trigger', filter=lambda x: x in ['cron', 'date', 'interval'], help='错误的调度策略！'),
        Argument('trigger_args')
    ).parse()
    if error is None:
        if not scheduler.valid_job_trigger(form.trigger, form.trigger_args):
            return json_response(message='数据格式校验失败！')
        job = Job.query.get_or_404(job_id)
        if job.update(**form):
            scheduler.update_job(job)
    return json_response(message=error)


@blueprint.route('/<int:job_id>/switch', methods=['POST', 'DELETE'])
@require_permission('job_task_edit')
def switch(job_id):
    job = Job.query.get_or_404(job_id)
    if request.method == 'POST':
        if job.trigger is None:
            return json_response(message='请在 更多-设置触发器 中配置调度策略')
        job.update(enabled=True)
        scheduler.add_job(job)
    elif request.method == 'DELETE':
        job.update(enabled=False)
        scheduler.remove_job(job.id)
    else:
        abort(405)
    return json_response()


@blueprint.route('/<int:job_id>', methods=['DELETE'])
@require_permission('job_task_del')
def delete(job_id):
    job = Job.query.get_or_404(job_id)
    job.delete()
    scheduler.remove_job(job.id)
    return json_response()


@blueprint.route('/groups/', methods=['GET'])
@require_permission('job_task_view')
def fetch_groups():
    apps = db.session.query(Job.group.distinct().label('group')).all()
    return json_response([x.group for x in apps])
