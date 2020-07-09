# Copyright: (c) OpenSpug Organization. https://github.com/openspug/spug
# Copyright: (c) <spug.dev@gmail.com>
# Released under the AGPL-3.0 License.
import django
from django.views.generic import View
from django.conf import settings
from libs import JsonParser, Argument, json_response
from apps.setting.utils import AppSetting
from apps.setting.models import Setting
import platform
import ldap
import smtplib


class SettingView(View):
    def get(self, request):
        data = Setting.objects.all()
        return json_response(data)

    def post(self, request):
        form, error = JsonParser(
            Argument('data', type=list, help='缺少必要的参数')
        ).parse(request.body)
        if error is None:
            for item in form.data:
                AppSetting.set(**item)
        return json_response(error=error)


def ldap_test(request):
    form, error = JsonParser(
        Argument('server'),
        Argument('port', type=int),
        Argument('admin_dn'),
        Argument('password'),
    ).parse(request.body)
    if error is None:
        try:
            con = ldap.initialize("ldap://{0}:{1}".format(form.server, form.port), bytes_mode=False)
            con.simple_bind_s(form.admin_dn, form.password)
            return json_response()
        except Exception as e:
            error = eval(str(e))
            return json_response(error=error['desc'])
    return json_response(error=error)


def email_test(request):
    form, error = JsonParser(
        Argument('server', help='请输入邮件服务地址'),
        Argument('port', type=int, help='请输入邮件服务端口号'),
        Argument('username', help='请输入邮箱账号'),
        Argument('password', help='请输入密码/授权码'),
    ).parse(request.body)
    if error is None:
        try:
            if form.port == 465:
                server = smtplib.SMTP_SSL(form.server, form.port, timeout=3)
            else:
                server = smtplib.SMTP(form.server, form.port, timeout=3)
            server.login(form.username, form.password)
            return json_response()    

        except Exception as e:
            error = f'{e}'
            return json_response(error=error)

    return json_response(error=error)


def get_about(request):
    return json_response({
        'python_version': platform.python_version(),
        'system_version': platform.platform(),
        'spug_version': settings.SPUG_VERSION,
        'django_version': django.get_version()
    })



