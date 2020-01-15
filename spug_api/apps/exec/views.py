# Copyright: (c) OpenSpug Organization. https://github.com/openspug/spug
# Copyright: (c) <spug.dev@gmail.com>
# Released under the MIT License.
from django.views.generic import View
from libs import json_response, JsonParser, Argument, human_datetime
from libs.channel import Channel
from apps.exec.models import ExecTemplate
from apps.host.models import Host


class TemplateView(View):
    def get(self, request):
        templates = ExecTemplate.objects.all()
        types = [x['type'] for x in templates.order_by('type').values('type').distinct()]
        return json_response({'types': types, 'templates': [x.to_dict() for x in templates]})

    def post(self, request):
        form, error = JsonParser(
            Argument('id', type=int, required=False),
            Argument('name', help='请输入模版名称'),
            Argument('type', help='请选择模版类型'),
            Argument('body', help='请输入模版内容'),
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

    def delete(self, request):
        form, error = JsonParser(
            Argument('id', type=int, help='请指定操作对象')
        ).parse(request.GET)
        if error is None:
            ExecTemplate.objects.filter(pk=form.id).delete()
        return json_response(error=error)


def do_task(request):
    form, error = JsonParser(
        Argument('host_ids', type=list, filter=lambda x: len(x), help='请选择执行主机'),
        Argument('command', help='请输入执行命令内容')
    ).parse(request.body)
    if error is None:
        token = Channel.get_token()
        for host in Host.objects.filter(id__in=form.host_ids):
            Channel.send_ssh_executor(
                token=token,
                hostname=host.hostname,
                port=host.port,
                username=host.username,
                command=form.command
            )
        return json_response(token)
    return json_response(error=error)
