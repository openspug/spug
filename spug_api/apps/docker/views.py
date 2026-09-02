from django.views.generic import View
from django_redis import get_redis_connection
from hashlib import sha256

from apps.account.utils import has_host_perm
from apps.docker.client import (
    DockerClientError,
    create_project,
    discover_projects,
    execute,
    manage_resource,
    read_config,
    remove_project,
    save_config,
)
from apps.host.models import Host
from libs import Argument, JsonParser, auth, json_response


def _host(user, host_id):
    if not host_id:
        raise DockerClientError('请先选择服务器')
    if not has_host_perm(user, host_id):
        raise DockerClientError('无权访问主机，请联系管理员')
    host = Host.objects.filter(pk=host_id).first()
    if not host:
        raise DockerClientError('主机不存在')
    return host


def _project_lock(host, resource):
    digest = sha256(resource.strip().encode('utf-8')).hexdigest()
    return get_redis_connection().lock(
        f'spug:docker:{host.id}:{digest}', timeout=1800, blocking_timeout=0)


def _target_form(body, with_action=False):
    arguments = [
        Argument('host_id', type=int, help='请选择服务器'),
        Argument('project', required=False),
        Argument('config_file', required=False),
    ]
    if with_action:
        arguments.extend([
            Argument('action', help='请选择 Docker 操作'),
            Argument('service', required=False),
            Argument('tail', type=int, required=False, default=200),
        ])
    return JsonParser(*arguments).parse(body)


class DiscoverView(View):
    @auth('docker.project.view')
    def post(self, request):
        form, error = JsonParser(Argument('host_id', type=int, required=False)).parse(request.body)
        if error:
            return json_response(error=error)
        try:
            return json_response(discover_projects(_host(request.user, form.host_id)))
        except DockerClientError as exc:
            return json_response(error=str(exc))


class CreateView(View):
    @auth('docker.project.add')
    def post(self, request):
        form, error = JsonParser(
            Argument('host_id', type=int, help='请选择服务器'),
            Argument('project', help='请输入项目名称'),
            Argument('workdir', help='请输入项目工作目录'),
            Argument('content', help='请输入 Docker Compose 配置'),
        ).parse(request.body)
        if error:
            return json_response(error=error)
        if not request.user.has_perms(['docker.project.do']):
            return json_response(error='权限拒绝')
        try:
            host = _host(request.user, form.host_id)
            lock = _project_lock(host, form.workdir)
            if not lock.acquire(blocking=False):
                return json_response(error='该项目正在执行其他操作，请稍后重试')
            try:
                return json_response(create_project(
                    host, form.project, form.workdir, form.content))
            finally:
                try:
                    lock.release()
                except Exception:
                    pass
        except DockerClientError as exc:
            return json_response(error=str(exc))


class ResourceView(View):
    @auth('docker.project.view|docker.project.do')
    def post(self, request):
        form, error = JsonParser(
            Argument('host_id', type=int, help='请选择服务器'),
            Argument('kind', help='请选择资源类型'),
            Argument('action', help='请选择操作'),
            Argument('target', required=False),
            Argument('force', type=bool, required=False, default=False),
        ).parse(request.body)
        if error:
            return json_response(error=error)
        # 只读列表沿用 view 权限；删除与清理属于破坏性操作，必须具备 do 权限。
        if form.action != 'list' and not request.user.has_perms(['docker.project.do']):
            return json_response(error='权限拒绝')
        try:
            host = _host(request.user, form.host_id)
            return json_response(manage_resource(
                host, form.kind, form.action, form.target, form.force))
        except DockerClientError as exc:
            return json_response(error=str(exc))


class RemoveView(View):
    @auth('docker.project.del')
    def post(self, request):
        form, error = JsonParser(
            Argument('host_id', type=int, help='请选择服务器'),
            Argument('project', help='请选择项目'),
            Argument('config_file', help='请选择 Compose 配置文件'),
            Argument('delete_files', type=bool, required=False, default=False),
        ).parse(request.body)
        if error:
            return json_response(error=error)
        try:
            host = _host(request.user, form.host_id)
            lock = _project_lock(host, form.config_file)
            if not lock.acquire(blocking=False):
                return json_response(error='该项目正在执行其他操作，请稍后重试')
            try:
                return json_response(remove_project(
                    host, form.project, form.config_file, form.delete_files))
            finally:
                try:
                    lock.release()
                except Exception:
                    pass
        except DockerClientError as exc:
            return json_response(error=str(exc))


class ConfigView(View):
    @auth('docker.project.edit')
    def get(self, request):
        form, error = JsonParser(
            Argument('host_id', type=int, help='请选择服务器'),
            Argument('project', help='请选择 Compose 项目'),
            Argument('config_file', help='请选择 Compose 配置文件'),
        ).parse(request.GET)
        if error:
            return json_response(error=error)
        try:
            return json_response(read_config(
                _host(request.user, form.host_id), form.project, form.config_file))
        except DockerClientError as exc:
            return json_response(error=str(exc))

    @auth('docker.project.edit')
    def post(self, request):
        form, error = JsonParser(
            Argument('host_id', type=int, help='请选择服务器'),
            Argument('project', help='请选择 Compose 项目'),
            Argument('config_file', help='请选择 Compose 配置文件'),
            Argument('content', help='请输入 Compose 配置'),
        ).parse(request.body)
        if error:
            return json_response(error=error)
        try:
            host = _host(request.user, form.host_id)
            lock = _project_lock(host, form.config_file)
            if not lock.acquire(blocking=False):
                return json_response(error='该项目正在执行其他操作，请稍后重试')
            try:
                return json_response(save_config(
                    host, form.project, form.config_file, form.content))
            finally:
                try:
                    lock.release()
                except Exception:
                    pass
        except DockerClientError as exc:
            return json_response(error=str(exc))


class ActionView(View):
    @auth('docker.project.view|docker.project.do')
    def post(self, request):
        form, error = _target_form(request.body, with_action=True)
        if error:
            return json_response(error=error)
        if form.action != 'logs' and not request.user.has_perms(['docker.project.do']):
            return json_response(error='权限拒绝')
        try:
            host = _host(request.user, form.host_id)
            if form.action == 'logs':
                return json_response(execute(
                    host, form.project, form.config_file,
                    form.action, form.service, form.tail))
            lock = _project_lock(host, form.config_file)
            if not lock.acquire(blocking=False):
                return json_response(error='该项目正在执行其他操作，请稍后重试')
            try:
                return json_response(execute(
                    host, form.project, form.config_file,
                    form.action, form.service, form.tail))
            finally:
                try:
                    lock.release()
                except Exception:
                    pass
        except DockerClientError as exc:
            return json_response(error=str(exc))
