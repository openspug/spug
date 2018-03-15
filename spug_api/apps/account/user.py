from flask import Blueprint, request, g
from apps.account.models import User
from libs.tools import json_response, JsonParser, Argument, human_diff_time
from libs.decorators import require_permission
from collections import defaultdict
from datetime import datetime
import uuid
import time

blueprint = Blueprint('account_page', __name__)
login_limit = defaultdict(int)


@blueprint.route('/', methods=['GET'])
@require_permission('account_user_view')
def get():
    form, error = JsonParser(
        Argument('page', type=int, default=1, required=False),
        Argument('pagesize', type=int, default=10, required=False),
        Argument('name', type=str, required=False),).parse(request.args)

    if error is None:
        user = User.query.filter_by(is_supper=False)
        if form.name:
            user = user.filter(User.nickname.like('%{}%'.format(form.name)))
        total = user.count()
        users = []
        now_time = datetime.now()
        for item in user.limit(form.pagesize).offset((form.page - 1) * form.pagesize).all():
            item = item.to_json()
            if item['token_expired']:
                item['last_login'] = human_diff_time(now_time, datetime.fromtimestamp(item['token_expired'] - 8 * 60 * 60)) + '前'
            else:
                item['last_login'] = '从未登录'
            users.append(item)
        return json_response({'data': users, 'total': total})
    return json_response(message=error)


@blueprint.route('/', methods=['POST'])
@require_permission('account_user_add')
def post():
    form, error = JsonParser('nickname', 'username', 'password',
                             Argument('role_id', type=int, help='请选择角色'),
                             Argument('email', nullable=True),
                             Argument('mobile', nullable=True)).parse()
    if error is None:
        username_is_exist = User.query.filter_by(username=form.username).first()
        if username_is_exist:
            return json_response(message="用户名已存在")
        User(**form).save()
        return json_response()
    return json_response(message=error)


@blueprint.route('/<int:u_id>', methods=['DELETE'])
@require_permission('account_user_del')
def delete(u_id):
    User.query.get_or_404(u_id).delete()
    return json_response(), 204


@blueprint.route('/<int:u_id>', methods=['PUT'])
@require_permission('account_user_edit | account_user_disable')
def put(u_id):
    form, error = JsonParser('nickname', 'is_active',
                             Argument('role_id', type=int, required=False, help='请选择角色'),
                             Argument('email', nullable=True),
                             Argument('password', nullable=False, required=False),
                             Argument('mobile', nullable=True)).parse()

    if error is None:
        u_info = User.query.get_or_404(u_id)
        if form.password:
            u_info.password = form.password
        if not u_info.update(**form) and form.password:
            u_info.save()
        return json_response(u_info)
    return json_response(message=error)


@blueprint.route('/setting/password', methods=['POST'])
def setting_password():
    form, error = JsonParser(
        Argument('password', help='请输入原密码'),
        Argument('newpassword', help='请输入新密码')
    ).parse()
    if error is None:
        if g.user.verify_password(form.password):
            g.user.password = form.newpassword
            g.user.save()
        else:
            return json_response(message='原密码错误')
    return json_response(message=error)


@blueprint.route('/setting/info', methods=['POST'])
def setting_info():
    form, error = JsonParser(
        Argument('nickname', help='请输入昵称'),
        Argument('mobile', help='请输入手机号码'),
        Argument('email', help='请输入电子邮件地址'),
    ).parse()
    if error is None:
        g.user.update(**form)
    return json_response(message=error)


@blueprint.route('/self', methods=['GET'])
def get_self():
    return json_response({
        'username': g.user.username,
        'nickname': g.user.nickname,
        'mobile': g.user.mobile,
        'email': g.user.email,
    })


@blueprint.route('/login/', methods=['POST'])
def login():
    form, error = JsonParser('username', 'password').parse()
    if error is None:
        user = User.query.filter_by(username=form.username).first()
        if user:
            if user.is_active:
                if user.verify_password(form.password):
                    login_limit.pop(form.username, None)
                    token = uuid.uuid4().hex
                    user.access_token = token
                    user.token_expired = time.time() + 8 * 60 * 60
                    user.save()
                    return json_response({
                        'token': token,
                        'is_supper': user.is_supper,
                        'nickname': user.nickname,
                        'permissions': list(user.permissions)
                    })
                else:
                    login_limit[form.username] += 1
                    if login_limit[form.username] >= 3:
                        user.update(is_active=False)
                    return json_response(message='用户名或密码错误，连续3次错误将会被禁用')
            else:
                return json_response(message='用户已被禁用，请联系管理员')
        elif login_limit[form.username] >= 3:
            return json_response(message='用户已被禁用，请联系管理员')
        else:
            login_limit[form.username] += 1
            return json_response(message='用户名或密码错误，连续3次错误将会被禁用')
    else:
        return json_response(message='请输入用户名和密码')


@blueprint.route('/logout/')
def logout():
    if g.user:
        g.user.access_token = ''
        g.user.save()
    return json_response('success')
