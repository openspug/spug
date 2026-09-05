# Copyright: (c) OpenSpug Organization. https://github.com/openspug/spug
# Copyright: (c) <spug.dev@gmail.com>
# Released under the AGPL-3.0 License.
import django
from django.core.cache import cache
from django.conf import settings
from libs import JsonParser, Argument, json_response, auth
from libs.utils import generate_random_str
from libs.ldap import LDAP
from libs.mail import Mail
from libs.push import get_balance, get_contacts, send_mfa_code
from libs.mixins import AdminView
from apps.setting.utils import AppSetting
from apps.setting.models import Setting, KEYS_DEFAULT
from apps.account.models import User
from copy import deepcopy
import platform
import json


def _mask_secret(value):
    """只回显首尾各若干位，短值整体打码，避免下发完整凭据到浏览器。"""
    if not isinstance(value, str) or not value:
        return value
    if len(value) <= 16:
        return '*' * len(value)
    return f'{value[:8]}********{value[-8:]}'


class SettingView(AdminView):
    # 这些 key 是对外服务的凭据，GET 时打码，前端只用它判断「是否已配置」
    MASK_KEYS = ('spug_push_key',)

    def get(self, request):
        response = deepcopy(KEYS_DEFAULT)
        for item in Setting.objects.all():
            if item.key in self.MASK_KEYS:
                response[item.key] = _mask_secret(item.real_val)
            else:
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
        code = generate_random_str(6)
        try:
            send_mfa_code(request.user.wx_token, code)
        except Exception as e:
            return json_response(error=f'{e}')
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
        Argument('admin_dn'),
        Argument('admin_password'),
        Argument('user_ou'),
        Argument('user_filter'),
        Argument('map_username'),
        Argument('map_nickname'),
    ).parse(request.body)
    print('form', form)
    if error is None:
        ldap = LDAP(form.server, form.admin_dn, form.admin_password, form.user_ou, form.user_filter, form.map_username, form.map_nickname)
        status, ret = ldap.all_user()
        if status:
            return json_response(ret)
        return json_response(error=ret)
    return json_response(error=error)


@auth('admin')
def ldap_import(request):
    form, error = JsonParser(
        Argument('ldap_data', type=list),
        Argument('username'),
        Argument('nickname'),
    ).parse(request.body)
    if error is None:
        for x in form.ldap_data:
            User.objects.update_or_create(
                username=x[form.username],
                defaults={'nickname': x[form.nickname], 'type': 'ldap'}
            )
        return json_response()
    return json_response(error=error)


class LDAPUserView(AdminView):
    def get(self, request):
        ldap_config = AppSetting.get('ldap_service')
        if not ldap_config:
            return json_response(error='LDAP服务未配置')
        ldap = LDAP(**ldap_config)
        status, ret = ldap.all_user()
        if status:
            cn_key, sn_key = ldap_config.get('map_username'), ldap_config.get('map_nickname')
            system_users = [x.username for x in User.objects.filter(type='ldap', is_deleted=False)]
            for index, u in enumerate(ret):
                u['cn'] = u[cn_key]
                u['sn'] = u[sn_key]
                u['is_exist'] = u.get(cn_key) in system_users
                u['id'] = index
            return json_response(ret)
        return json_response(error=ret)
    
    def post(self, request):
        form, error = JsonParser(
            Argument('server'),
            Argument('admin_dn'),
            Argument('admin_password'),
            Argument('user_ou'),
            Argument('user_filter'),
            Argument('map_username'),
            Argument('map_nickname'),
            Argument('ldap_user', help='LDAP用户不能为空'),
            Argument('ldap_password', help='LDAP密码不能为空'),
            ).parse(request.body)
        if error is None:
            ldap = LDAP(form.server, form.admin_dn, form.admin_password, form.user_ou, form.user_filter, form.map_username, form.map_nickname)
            status, msg = ldap.verify_user(form.ldap_user, form.ldap_password)
            if status:
                return json_response()
            return json_response(error=msg)
        return json_response(error=error)


@auth('admin')
def email_test(request):
    form, error = JsonParser(
        Argument('server', help='请输入邮件服务地址'),
        Argument('port', type=int, help='请输入邮件服务端口号'),
        Argument('username', help='请输入邮箱账号'),
        Argument('password', help='请输入密码/授权码'),
        Argument('nickname', required=False),
    ).parse(request.body)
    if error is None:
        try:
            mail = Mail(**form)
            mail.send_text_mail(
                [form.username],
                'Spug 邮件服务测试',
                '这是一封来自 Spug 的测试邮件，收到此邮件表示邮件服务配置正常。',
            )
            return json_response()
        except Exception as e:
            error = f'{e}'
    return json_response(error=error)


@auth('admin')
def mfa_test(request):
    code = generate_random_str(6)
    try:
        send_mfa_code(request.user.wx_token, code)
    except Exception as e:
        return json_response(error=f'{e}')
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


@auth('admin')
def handle_push_bind(request):
    form, error = JsonParser(
        Argument('spug_push_key', required=False),
    ).parse(request.body)
    if error is None:
        if not form.spug_push_key:
            # 推送助手是 MFA 验证码的唯一下发通道，解绑前必须先关闭 MFA，否则所有人都登不进来
            if AppSetting.get_default('MFA', {'enable': False}).get('enable'):
                return json_response(error='已开启登录MFA认证，请先在安全设置中关闭MFA后再解除绑定。')
            AppSetting.delete('spug_push_key')
            return json_response()

        try:
            res = get_balance(form.spug_push_key)
        except Exception as e:
            return json_response(error=f'绑定失败：{e}')

        AppSetting.set('spug_push_key', form.spug_push_key)
        return json_response(res)
    return json_response(error=error)


@auth('admin')
def handle_push_balance(request):
    token = AppSetting.get_default('spug_push_key')
    if not token:
        return json_response(error='请先配置推送服务绑定账户')
    try:
        return json_response(get_balance(token))
    except Exception as e:
        return json_response(error=f'{e}')


@auth('pipeline.pipeline.add|pipeline.pipeline.edit')
def handle_push_contacts(request):
    """供流水线「推送助手」节点选择推送对象。

    返回 {bound, contacts}：未绑定时 bound 为 false，节点配置页据此给出去绑定的引导；
    已绑定但取联系人失败则直接返回错误，避免被误认为「还没绑定」。
    """
    token = AppSetting.get_default('spug_push_key')
    if not token:
        return json_response({'bound': False, 'contacts': []})
    try:
        return json_response({'bound': True, 'contacts': get_contacts(token)})
    except Exception as e:
        return json_response(error=f'获取推送对象失败：{e}')
