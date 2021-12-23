# Copyright: (c) OpenSpug Organization. https://github.com/openspug/spug
# Copyright: (c) <spug.dev@gmail.com>
# Released under the AGPL-3.0 License.
import django
from django.core.cache import cache
from django.conf import settings
from libs import JsonParser, Argument, json_response, auth
from libs.utils import generate_random_str
from libs.mail import Mail
from libs.spug import send_login_wx_code
from libs.mixins import AdminView
from apps.setting.utils import AppSetting
from apps.setting.models import Setting, KEYS_DEFAULT
from copy import deepcopy
import platform
import ldap


class SettingView(AdminView):
    def get(self, request):
        response = deepcopy(KEYS_DEFAULT)
        for item in Setting.objects.all():
            response[item.key] = item.real_val
        return json_response(response)

    def post(self, request):
        form, error = JsonParser(
            Argument('data', type=list, help='缺少必要的参数')
        ).parse(request.body)
        if error is None:
            for item in form.data:
                AppSetting.set(**item)
        return json_response(error=error)


class MFAView(AdminView):
    def get(self, request):
        if not request.user.wx_token:
            return json_response(error='检测到当前账户未配置微信Token，请配置后再尝试启用MFA认证，否则可能造成系统无法正常登录。')
        code = generate_random_str(6)
        send_login_wx_code(request.user.wx_token, code)
        cache.set(f'{request.user.username}:code', code, 300)
        return json_response()

    def post(self, request):
        form, error = JsonParser(
            Argument('enable', type=bool, help='参数错误'),
            Argument('code', required=False)
        ).parse(request.body)
        if error is None:
            if form.enable:
                if not form.code:
                    return json_response(error='请输入验证码')
                key = f'{request.user.username}:code'
                code = cache.get(key)
                if not code:
                    return json_response(error='验证码已失效，请重新获取')
                if code != form.code:
                    ttl = cache.ttl(key)
                    cache.expire(key, ttl - 100)
                    return json_response(error='验证码错误')
                cache.delete(key)
            AppSetting.set('MFA', {'enable': form.enable})
        return json_response(error=error)


@auth('admin')
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


@auth('admin')
def email_test(request):
    form, error = JsonParser(
        Argument('server', help='请输入邮件服务地址'),
        Argument('port', type=int, help='请输入邮件服务端口号'),
        Argument('username', help='请输入邮箱账号'),
        Argument('password', help='请输入密码/授权码'),
    ).parse(request.body)
    if error is None:
        try:
            mail = Mail(**form)
            server = mail.get_server()
            server.quit()
            return json_response()
        except Exception as e:
            error = f'{e}'
    return json_response(error=error)


@auth('admin')
def mfa_test(request):
    if not request.user.wx_token:
        return json_response(error='检测到当前账户未配置微信Token，请配置后再尝试启用MFA认证，否则可能造成系统无法正常登录。')
    code = generate_random_str(6)
    send_login_wx_code(request.user.wx_token, code)
    cache.set(f'{request.user.username}:code', code, 300)
    return json_response()


@auth('admin')
def get_about(request):
    return json_response({
        'python_version': platform.python_version(),
        'system_version': platform.platform(),
        'spug_version': settings.SPUG_VERSION,
        'django_version': django.get_version()
    })
