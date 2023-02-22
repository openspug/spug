# Copyright: (c) OpenSpug Organization. https://github.com/openspug/spug
# Copyright: (c) <spug.dev@gmail.com>
# Released under the AGPL-3.0 License.
from django.views.generic import View
from django.db.models import Q
from libs import JsonParser, Argument, json_response, auth
from libs.gitlib import RemoteGit
from apps.credential.models import Credential


class CredView(View):
    def get(self, request):
        credentials = Credential.objects.filter(Q(created_by=request.user) | Q(is_public=True))
        return json_response([x.to_view(request.user) for x in credentials])

    @auth('deploy.app.add|deploy.app.edit|config.app.add|config.app.edit')
    def post(self, request):
        form, error = JsonParser(
            Argument('id', type=int, required=False),
            Argument('name', help='请输入凭据名称'),
            Argument('username', help='请输入用户名'),
            Argument('type', filter=lambda x: x in dict(Credential.TYPES), help='请选择凭据类型'),
            Argument('is_public', type=bool, default=False),
            Argument('secret', help='请输入密码/密钥'),
            Argument('extra', required=False),
        ).parse(request.body)
        if error is None:
            if form.id:
                credential = Credential.objects.get(pk=form.id)
                if credential.created_by_id != request.user.id:
                    return json_response(error='共享凭据无权修改')
                credential.update_by_dict(form)
            else:
                Credential.objects.create(created_by=request.user, **form)
        return json_response(error=error)

    @auth('deploy.app.del|config.app.del')
    def delete(self, request):
        form, error = JsonParser(
            Argument('id', type=int, help='请指定操作对象')
        ).parse(request.GET)
        if error is None:
            Credential.objects.filter(pk=form.id, created_by=request.user).delete()
        return json_response(error=error)


def handle_check(request):
    form, error = JsonParser(
        Argument('id', type=int, required=False),
        Argument('type', filter=lambda x: x in ('git',), help='参数错误'),
        Argument('data', help='参数错误')
    ).parse(request.body)
    if error is None:
        credential = None
        if form.id:
            credential = Credential.objects.get(pk=form.id)
        if form.type == 'git':
            is_pass, message = RemoteGit.check_auth(form.data, credential)
            return json_response({'is_pass': is_pass, 'message': message})
    return json_response(error=error)
