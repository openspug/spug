# Copyright: (c) OpenSpug Organization. https://github.com/openspug/spug
# Copyright: (c) <spug.dev@gmail.com>
# Released under the AGPL-3.0 License.
from django.core.cache import cache
from django.views.generic import View
from django.db.models import F
from libs import JsonParser, Argument, human_datetime, json_response
from libs.utils import get_request_real_ip
from apps.account.models import User, Role, History
from apps.setting.utils import AppSetting
from libs.ldap import LDAP
import ipaddress
import time
import uuid
import json


class UserView(View):
    def get(self, request):
        users = []
        for u in User.objects.filter(is_supper=False, deleted_by_id__isnull=True).annotate(role_name=F('role__name')):
            tmp = u.to_dict(excludes=('access_token', 'password_hash'))
            tmp['role_name'] = u.role_name
            users.append(tmp)
        return json_response(users)

    def post(self, request):
        form, error = JsonParser(
            Argument('username', help='请输入登录名'),
            Argument('password', help='请输入密码'),
            Argument('nickname', help='请输入姓名'),
            Argument('role_id', type=int, help='请选择角色'),
        ).parse(request.body)
        if error is None:
            if User.objects.filter(username=form.username, deleted_by_id__isnull=True).exists():
                return json_response(error=f'已存在登录名为【{form.username}】的用户')
            form.password_hash = User.make_password(form.pop('password'))
            form.created_by = request.user
            User.objects.create(**form)
        return json_response(error=error)

    def patch(self, request):
        form, error = JsonParser(
            Argument('id', type=int, help='请指定操作对象'),
            Argument('username', required=False),
            Argument('password', required=False),
            Argument('nickname', required=False),
            Argument('role_id', required=False),
            Argument('is_active', type=bool, required=False),
        ).parse(request.body, True)
        if error is None:
            if form.get('password'):
                form.token_expired = 0
                form.password_hash = User.make_password(form.pop('password'))
            if 'username' in form:
                if User.objects.filter(username=form.username, deleted_by_id__isnull=True).exclude(id=form.id).exists():
                    return json_response(error=f'已存在登录名为【{form.username}】的用户')
            if 'is_active' in form:
                user = User.objects.get(pk=form.id)
                cache.delete(user.username)
            User.objects.filter(pk=form.pop('id')).update(**form)
        return json_response(error=error)

    def delete(self, request):
        form, error = JsonParser(
            Argument('id', type=int, help='请指定操作对象')
        ).parse(request.GET)
        if error is None:
            user = User.objects.filter(pk=form.id).first()
            if user:
                if user.type == 'ldap':
                    return json_response(error='ldap账户无法删除，请使用禁用功能来禁止该账户访问系统')
                user.role_id = None
                user.deleted_at = human_datetime()
                user.deleted_by = request.user
                user.save()
        return json_response(error=error)


class RoleView(View):
    def get(self, request):
        roles = Role.objects.all()
        return json_response(roles)

    def post(self, request):
        form, error = JsonParser(
            Argument('id', type=int, required=False),
            Argument('name', help='请输入角色名称'),
            Argument('desc', required=False)
        ).parse(request.body)
        if error is None:
            if form.id:
                Role.objects.filter(pk=form.id).update(**form)
            else:
                Role.objects.create(created_by=request.user, **form)
        return json_response(error=error)

    def patch(self, request):
        form, error = JsonParser(
            Argument('id', type=int, help='参数错误'),
            Argument('page_perms', type=dict, required=False),
            Argument('deploy_perms', type=dict, required=False),
            Argument('host_perms', type=list, required=False)
        ).parse(request.body)
        if error is None:
            role = Role.objects.filter(pk=form.pop('id')).first()
            if not role:
                return json_response(error='未找到指定角色')
            if form.page_perms is not None:
                role.page_perms = json.dumps(form.page_perms)
            if form.deploy_perms is not None:
                role.deploy_perms = json.dumps(form.deploy_perms)
            if form.host_perms is not None:
                role.host_perms = json.dumps(form.host_perms)
            role.user_set.update(token_expired=0)
            role.save()
        return json_response(error=error)

    def delete(self, request):
        form, error = JsonParser(
            Argument('id', type=int, help='参数错误')
        ).parse(request.GET)
        if error is None:
            if User.objects.filter(role_id=form.id).exists():
                return json_response(error='已有用户使用了该角色，请解除关联后再尝试删除')
            Role.objects.filter(pk=form.id).delete()
        return json_response(error=error)


class SelfView(View):
    def patch(self, request):
        form, error = JsonParser(
            Argument('old_password', required=False),
            Argument('new_password', required=False),
            Argument('nickname', required=False),
        ).parse(request.body, True)
        if error is None:
            if form.get('old_password') and form.get('new_password'):
                if request.user.type == 'ldap':
                    return json_response(error='LDAP账户无法修改密码')
                if len(form.new_password) < 6:
                    return json_response(error='请设置至少6位的新密码')
                if request.user.verify_password(form.old_password):
                    request.user.password_hash = User.make_password(form.new_password)
                    request.user.token_expired = 0
                    request.user.save()
                else:
                    return json_response(error='原密码错误，请重新输入')
            if form.get('nickname'):
                request.user.nickname = form.nickname
                request.user.save()
        return json_response(error=error)


def login(request):
    form, error = JsonParser(
        Argument('username', help='请输入用户名'),
        Argument('password', help='请输入密码'),
        Argument('type', required=False)
    ).parse(request.body)
    if error is None:
        x_real_ip = get_request_real_ip(request.headers)
        user = User.objects.filter(username=form.username, type=form.type).first()
        if user and not user.is_active:
            return json_response(error="账户已被系统禁用")
        if form.type == 'ldap':
            if not AppSetting.get_default('ldap_service'):
                return json_response(error='请在系统设置中配置LDAP后再尝试通过该方式登录')
            ldap = LDAP()
            is_success, message = ldap.valid_user(form.username, form.password)
            if is_success:
                if not user:
                    user = User.objects.create(username=form.username, nickname=form.username, type=form.type)
                return handle_user_info(user, x_real_ip)
            elif message:
                return json_response(error=message)
        else:
            if user and user.deleted_by is None:
                if user.verify_password(form.password):
                    return handle_user_info(user, x_real_ip)

        value = cache.get_or_set(form.username, 0, 86400)
        if value >= 3:
            if user and user.is_active:
                user.is_active = False
                user.save()
            return json_response(error='账户已被系统禁用')
        cache.set(form.username, value + 1, 86400)
        return json_response(error="用户名或密码错误，连续多次错误账户将会被禁用")
    return json_response(error=error)


def handle_user_info(user, x_real_ip):
    cache.delete(user.username)
    token_isvalid = user.access_token and len(user.access_token) == 32 and user.token_expired >= time.time()
    user.access_token = user.access_token if token_isvalid else uuid.uuid4().hex
    user.token_expired = time.time() + 8 * 60 * 60
    user.last_login = human_datetime()
    user.last_ip = x_real_ip
    user.save()
    History.objects.create(user=user, ip=x_real_ip)
    verify_ip = AppSetting.get_default('verify_ip', 'True') == 'True'
    return json_response({
        'access_token': user.access_token,
        'nickname': user.nickname,
        'is_supper': user.is_supper,
        'has_real_ip': x_real_ip and ipaddress.ip_address(x_real_ip).is_global if verify_ip else True,
        'host_perms': [] if user.is_supper else user.host_perms,
        'permissions': [] if user.is_supper else user.page_perms
    })


def logout(request):
    request.user.token_expired = 0
    request.user.save()
    return json_response()
