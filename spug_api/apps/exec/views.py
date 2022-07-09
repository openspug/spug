# Copyright: (c) OpenSpug Organization. https://github.com/openspug/spug
# Copyright: (c) <spug.dev@gmail.com>
# Released under the AGPL-3.0 License.
from django.views.generic import View
from django_redis import get_redis_connection
from django.conf import settings
from libs import json_response, JsonParser, Argument, human_datetime, auth
from apps.exec.models import ExecTemplate, ExecHistory
from apps.host.models import Host
from apps.account.utils import has_host_perm
import uuid
import json


class TemplateView(View):
    @auth('exec.template.view|exec.task.do|schedule.schedule.add|schedule.schedule.edit|\
    monitor.monitor.add|monitor.monitor.edit')
    def get(self, request):
        templates = ExecTemplate.objects.all()
        types = [x['type'] for x in templates.order_by('type').values('type').distinct()]
        return json_response({'types': types, 'templates': [x.to_view() for x in templates]})

    @auth('exec.template.add|exec.template.edit')
    def post(self, request):
        form, error = JsonParser(
            Argument('id', type=int, required=False),
            Argument('name', help='请输入模版名称'),
            Argument('type', help='请选择模版类型'),
            Argument('body', help='请输入模版内容'),
            Argument('interpreter', default='sh'),
            Argument('host_ids', type=list, handler=json.dumps, default=[]),
            Argument('parameters', type=list, handler=json.dumps, default=[]),
            Argument('desc', required=False)
        ).parse(request.body)
        if error is None:
            if form.id:
                form.updated_at = human_datetime()
                form.updated_by = request.user
                ExecTemplate.objects.filter(pk=form.pop('id')).update(**form)
            else:
                form.created_by = request.user
                ExecTemplate.objects.create(**form)
        return json_response(error=error)

    @auth('exec.template.del')
    def delete(self, request):
        form, error = JsonParser(
            Argument('id', type=int, help='请指定操作对象')
        ).parse(request.GET)
        if error is None:
            ExecTemplate.objects.filter(pk=form.id).delete()
        return json_response(error=error)


class TaskView(View):
    @auth('exec.task.do')
    def get(self, request):
        records = ExecHistory.objects.filter(user=request.user).select_related('template')
        return json_response([x.to_view() for x in records])

    @auth('exec.task.do')
    def post(self, request):
        form, error = JsonParser(
            Argument('host_ids', type=list, filter=lambda x: len(x), help='请选择执行主机'),
            Argument('command', help='请输入执行命令内容'),
            Argument('interpreter', default='sh'),
            Argument('template_id', type=int, required=False),
            Argument('params', type=dict, handler=json.dumps, default={})
        ).parse(request.body)
        if error is None:
            if not has_host_perm(request.user, form.host_ids):
                return json_response(error='无权访问主机，请联系管理员')
            token, rds = uuid.uuid4().hex, get_redis_connection()
            form.host_ids.sort()
            if form.template_id:
                template = ExecTemplate.objects.filter(pk=form.template_id).first()
                if not template or template.body != form.command:
                    form.template_id = None

            ExecHistory.objects.create(
                user=request.user,
                digest=token,
                interpreter=form.interpreter,
                template_id=form.template_id,
                command=form.command,
                host_ids=json.dumps(form.host_ids),
                params=form.params
            )
            return json_response(token)
        return json_response(error=error)

    @auth('exec.task.do')
    def patch(self, request):
        form, error = JsonParser(
            Argument('token', help='参数错误'),
            Argument('cols', type=int, required=False),
            Argument('rows', type=int, required=False)
        ).parse(request.body)
        if error is None:
            term = None
            if form.cols and form.rows:
                term = {'width': form.cols, 'height': form.rows}
            rds = get_redis_connection()
            task = ExecHistory.objects.get(digest=form.token)
            for host in Host.objects.filter(id__in=json.loads(task.host_ids)):
                data = dict(
                    key=host.id,
                    name=host.name,
                    token=task.digest,
                    interpreter=task.interpreter,
                    hostname=host.hostname,
                    port=host.port,
                    username=host.username,
                    command=task.command,
                    pkey=host.private_key,
                    params=json.loads(task.params),
                    term=term
                )
                rds.rpush(settings.EXEC_WORKER_KEY, json.dumps(data))
        return json_response(error=error)



