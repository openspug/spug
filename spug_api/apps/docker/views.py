import json
import logging

from django.db import close_old_connections
from django.http import StreamingHttpResponse
from django.views.generic import View
from django_redis import get_redis_connection
from hashlib import sha256

from apps.account.utils import has_host_perm
from apps.docker.client import (
    DockerClientError,
    build_container_logs_follow_command,
    build_logs_follow_command,
    create_project,
    discover_all,
    execute,
    execute_container,
    get_project,
    manage_resource,
    peek_inspect,
    read_config,
    remove_project,
    save_config,
    stream_logs,
    stream_stats,
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


# 日志按批下发的行数上限，避免单条 SSE 消息过大拖慢前端
LOG_BATCH_LINES = 200


def _pack(event):
    return f'data: {json.dumps(event, ensure_ascii=False)}\n\n'


def _sse(generator):
    response = StreamingHttpResponse(generator, content_type='text/event-stream')
    response['Cache-Control'] = 'no-cache'
    response['X-Accel-Buffering'] = 'no'   # 关闭 nginx 缓冲，保证逐条下发
    return response


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
        form, error = JsonParser(
            Argument('host_id', type=int, required=False),
            # 允许返回长效缓存：界面首屏用它秒开，前端随后必须再请求一次实时数据
            Argument('use_cache', type=bool, required=False, default=False),
        ).parse(request.body)
        if error:
            return json_response(error=error)
        try:
            host = _host(request.user, form.host_id)
            payload = peek_inspect(host) if form.use_cache else None
            # cached 告诉前端这份数据可能是旧的，需要再发一次强制刷新
            cached = payload is not None
            if payload is None:
                payload = discover_all(host)
            return json_response({
                'projects': payload['projects'],
                'standalone': payload['standalone'],
                'cached': cached,
            })
        except DockerClientError as exc:
            return json_response(error=str(exc))


class ContainerView(View):
    """独立容器（非 compose 管理）的受限操作：启停、重启、日志、删除。"""

    @auth('docker.project.view|docker.project.do|docker.project.del')
    def post(self, request):
        form, error = JsonParser(
            Argument('host_id', type=int, help='请选择服务器'),
            Argument('name', help='请选择容器'),
            Argument('action', help='请选择操作'),
            Argument('tail', type=int, required=False, default=200),
        ).parse(request.body)
        if error:
            return json_response(error=error)
        # 删除容器不可逆，按删除项目同一套权限把关
        if form.action == 'remove':
            if not request.user.has_perms(['docker.project.del']):
                return json_response(error='权限拒绝')
        elif form.action != 'logs' and not request.user.has_perms(['docker.project.do']):
            return json_response(error='权限拒绝')
        try:
            host = _host(request.user, form.host_id)
            if form.action == 'logs':
                return json_response(execute_container(host, 'logs', form.name, form.tail))
            # 与 compose 项目共用一把锁的粒度不同，这里按容器名加锁即可
            lock = _project_lock(host, f'container:{form.name}')
            if not lock.acquire(blocking=False):
                return json_response(error='该容器正在执行其他操作，请稍后重试')
            try:
                return json_response(execute_container(host, form.action, form.name))
            finally:
                try:
                    lock.release()
                except Exception:
                    pass
        except DockerClientError as exc:
            return json_response(error=str(exc))


class StatsView(View):
    """SSE：按秒推送项目内各容器的 CPU / 内存占用。"""

    @auth('docker.project.view|docker.project.do')
    def get(self, request):
        form, error = JsonParser(
            Argument('host_id', type=int, help='请选择服务器'),
            Argument('project', required=False),
            Argument('config_file', required=False),
            # 独立容器没有 compose 项目，直接按名字采样
            Argument('names', required=False),
        ).parse(request.GET)
        if error:
            return json_response(error=error)
        try:
            host = _host(request.user, form.host_id)
            if form.project and form.config_file:
                containers = get_project(host, form.project, form.config_file).containers
            elif form.names:
                wanted = {item for item in form.names.split(',') if item}
                # 只允许采样主机上真实存在的独立容器，避免用它探测任意容器
                containers = [item for item in discover_all(host, use_cache=True)['standalone']
                              if item['name'] in wanted]
            else:
                return json_response(error='请指定 Compose 项目或容器')
        except DockerClientError as exc:
            return json_response(error=str(exc))
        names = [item['name'] for item in containers
                 if item.get('state') == 'running' and item.get('name')]

        def produce():
            last = None
            try:
                if not names:
                    yield _pack({'type': 'stats', 'stats': {}})
                    return
                for stats in stream_stats(host, names):
                    # docker stats 每个周期会重绘一次，产生一帧完全相同的数据。
                    # 去重避免前端每秒白渲染两次，同时用注释行保活连接。
                    if stats == last:
                        yield ': keep-alive\n\n'
                        continue
                    last = stats
                    yield _pack({'type': 'stats', 'stats': stats})
            except GeneratorExit:
                raise
            except Exception as exc:
                logging.warning(f'docker stats stream error: {exc}')
                yield pack({'type': 'error', 'message': str(exc)})
            finally:
                close_old_connections()

        return _sse(produce())


class LogStreamView(View):
    """SSE：跟随输出容器日志（docker compose logs -f / docker logs -f）。"""

    @auth('docker.project.view|docker.project.do')
    def get(self, request):
        form, error = JsonParser(
            Argument('host_id', type=int, help='请选择服务器'),
            Argument('project', required=False),
            Argument('config_file', required=False),
            Argument('service', required=False),
            # 独立容器按名字跟随
            Argument('name', required=False),
            Argument('tail', type=int, required=False, default=200),
        ).parse(request.GET)
        if error:
            return json_response(error=error)
        try:
            host = _host(request.user, form.host_id)
            if form.project and form.config_file:
                project = get_project(host, form.project, form.config_file)
                command = build_logs_follow_command(project, form.service, form.tail)
            elif form.name:
                # 与 ContainerView 一致：只允许跟随主机上真实存在的独立容器
                known = {item['name'] for item in discover_all(host, use_cache=True)['standalone']}
                if form.name not in known:
                    return json_response(error='容器已变化，请刷新后重试')
                command = build_container_logs_follow_command(form.name, form.tail)
            else:
                return json_response(error='请指定 Compose 项目或容器')
        except DockerClientError as exc:
            return json_response(error=str(exc))

        def produce():
            buffer = []
            try:
                for line in stream_logs(host, command):
                    if line is None:
                        # 读取空闲：把攒着的行发出去，没有就发心跳保活
                        if buffer:
                            yield _pack({'type': 'log', 'lines': buffer})
                            buffer = []
                        else:
                            yield ': keep-alive\n\n'
                        continue
                    buffer.append(line)
                    # 日志可能突然涌入上万行，按批下发避免单条消息过大
                    if len(buffer) >= LOG_BATCH_LINES:
                        yield _pack({'type': 'log', 'lines': buffer})
                        buffer = []
                if buffer:
                    yield _pack({'type': 'log', 'lines': buffer})
                yield _pack({'type': 'done'})
            except GeneratorExit:
                raise
            except Exception as exc:
                logging.warning(f'docker logs stream error: {exc}')
                yield _pack({'type': 'error', 'message': str(exc)})
            finally:
                close_old_connections()

        return _sse(produce())


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
