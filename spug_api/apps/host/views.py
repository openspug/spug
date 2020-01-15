# Copyright: (c) OpenSpug Organization. https://github.com/openspug/spug
# Copyright: (c) <spug.dev@gmail.com>
# Released under the MIT License.
from django.views.generic import View
from django.shortcuts import render
from django.http.response import HttpResponseBadRequest
from libs import json_response, JsonParser, Argument
from apps.setting.utils import AppSetting
from apps.host.models import Host
from libs.ssh import SSH, AuthenticationException
from libs import human_datetime


class HostView(View):
    def get(self, request):
        hosts = Host.objects.filter(deleted_by_id__isnull=True)
        zones = [x['zone'] for x in hosts.order_by('zone').values('zone').distinct()]
        return json_response({'zones': zones, 'hosts': [x.to_dict() for x in hosts]})

    def post(self, request):
        form, error = JsonParser(
            Argument('id', type=int, required=False),
            Argument('zone', help='请输入主机类型'),
            Argument('name', help='请输主机名称'),
            Argument('username', help='请输入登录用户名'),
            Argument('hostname', help='请输入主机名或IP'),
            Argument('port', type=int, help='请输入SSH端口'),
            Argument('desc', required=False),
            Argument('password', required=False),
        ).parse(request.body)
        if error is None:
            if valid_ssh(form.hostname, form.port, form.username, form.pop('password')) is False:
                return json_response('auth fail')

            if form.id:
                Host.objects.filter(pk=form.pop('id')).update(**form)
            else:
                form.created_by = request.user
                Host.objects.create(**form)
        return json_response(error=error)

    def delete(self, request):
        form, error = JsonParser(
            Argument('id', type=int, help='请指定操作对象')
        ).parse(request.GET)
        if error is None:
            Host.objects.filter(pk=form.id).update(
                deleted_at=human_datetime(),
                deleted_by=request.user,
            )
        return json_response(error=error)


def web_ssh(request, h_id):
    host = Host.objects.filter(pk=h_id).first()
    if not host:
        return HttpResponseBadRequest('unknown host')
    context = {'id': h_id, 'title': host.name, 'token': request.user.access_token}
    return render(request, 'web_ssh.html', context)


def valid_ssh(hostname, port, username, password):
    try:
        private_key = AppSetting.get('private_key')
        public_key = AppSetting.get('public_key')
    except KeyError:
        private_key, public_key = SSH.generate_key()
        AppSetting.set('private_key', private_key, 'ssh private key')
        AppSetting.set('public_key', public_key, 'ssh public key')
    if password:
        cli = SSH(hostname, port, username, password=password)
        code, out = cli.exec_command('mkdir -p -m 700 ~/.ssh && \
                echo %r >> ~/.ssh/authorized_keys && \
                chmod 600 ~/.ssh/authorized_keys' % public_key)
        if code != 0:
            raise Exception(f'add public key error: {out!r}')
    else:
        cli = SSH(hostname, port, username, private_key)

    try:
        cli.ping()
    except AuthenticationException:
        return False
    return True
