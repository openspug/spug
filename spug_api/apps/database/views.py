from django.db import transaction
from django.views.generic import View

from libs import Argument, JsonParser, auth, json_response
from apps.database.client import DatabaseClientError, execute, metadata, test_connection
from apps.database.models import DatabaseConnection


def _connection_form(body, partial=False):
    return JsonParser(
        Argument('id', type=int, required=False),
        Argument('name', help='请输入连接名称'),
        Argument('type', filter=lambda x: x in dict(DatabaseConnection.TYPES), help='请选择数据库类型'),
        Argument('host', help='请输入主机地址'),
        Argument('port', type=int, filter=lambda x: 0 < x < 65536, help='请输入有效端口'),
        Argument('username', required=False, default=''),
        Argument('password', required=False, default=''),
        Argument('database', required=False, default=''),
        Argument('use_ssl', type=bool, default=False),
    ).parse(body, partial)


def _temporary_connection(form):
    item = DatabaseConnection(
        name=form.get('name') or 'temp', type=form.type, host=form.host,
        port=form.port, username=form.get('username') or '',
        database=form.get('database') or '', use_ssl=form.get('use_ssl') or False,
    )
    item.set_password(form.get('password') or '')
    return item


class ConnectionView(View):
    @auth('database.connection.view')
    def get(self, request):
        return json_response([item.to_view() for item in DatabaseConnection.objects.all()])

    @auth('database.connection.add|database.connection.edit')
    def post(self, request):
        form, error = _connection_form(request.body)
        if error:
            return json_response(error=error)
        required_perm = 'database.connection.edit' if form.id else 'database.connection.add'
        if not request.user.has_perms([required_perm]):
            return json_response(error='权限拒绝')
        other = DatabaseConnection.objects.filter(name=form.name).exclude(pk=form.id or 0).first()
        if other:
            return json_response(error=f'已存在的连接名称【{form.name}】')
        with transaction.atomic():
            if form.id:
                item = DatabaseConnection.objects.filter(pk=form.id).first()
                if not item:
                    return json_response(error='数据库连接不存在')
                password = form.pop('password')
                form.pop('id')
                for key, value in form.items():
                    setattr(item, key, value)
                if password:
                    item.set_password(password)
                item.save()
            else:
                password = form.pop('password')
                form.pop('id')
                item = DatabaseConnection(created_by=request.user, **form)
                item.set_password(password)
                item.save()
        return json_response(item.to_view())

    @auth('database.connection.del')
    def delete(self, request):
        form, error = JsonParser(
            Argument('id', type=int, help='请指定操作对象')
        ).parse(request.GET)
        if error is None:
            DatabaseConnection.objects.filter(pk=form.id).delete()
        return json_response(error=error)


@auth('database.connection.add|database.connection.edit')
def check_connection(request):
    form, error = _connection_form(request.body)
    if error:
        return json_response(error=error)
    required_perm = 'database.connection.edit' if form.id else 'database.connection.add'
    if not request.user.has_perms([required_perm]):
        return json_response(error='权限拒绝')
    if form.id and not form.password:
        item = DatabaseConnection.objects.filter(pk=form.id).first()
        if not item:
            return json_response(error='数据库连接不存在')
        for key in ('name', 'type', 'host', 'port', 'username', 'database', 'use_ssl'):
            setattr(item, key, form.get(key))
    else:
        item = _temporary_connection(form)
    try:
        elapsed = test_connection(item)
    except DatabaseClientError as exc:
        return json_response(error=f'连接失败: {exc}')
    return json_response({'elapsed': elapsed})


@auth('database.connection.view')
def get_metadata(request):
    form, error = JsonParser(
        Argument('id', type=int, help='请指定数据库连接')
    ).parse(request.GET)
    if error:
        return json_response(error=error)
    item = DatabaseConnection.objects.filter(pk=form.id).first()
    if not item:
        return json_response(error='数据库连接不存在')
    try:
        return json_response(metadata(item))
    except DatabaseClientError as exc:
        return json_response(error=f'连接失败: {exc}')


@auth('database.query.do')
def run_command(request):
    if not request.user.has_perms(['database.connection.view']):
        return json_response(error='权限拒绝')
    form, error = JsonParser(
        Argument('id', type=int, help='请指定数据库连接'),
        Argument('command', help='请输入要执行的命令'),
    ).parse(request.body)
    if error:
        return json_response(error=error)
    item = DatabaseConnection.objects.filter(pk=form.id).first()
    if not item:
        return json_response(error='数据库连接不存在')
    try:
        return json_response(execute(item, form.command))
    except DatabaseClientError as exc:
        return json_response(error=f'执行失败: {exc}')
