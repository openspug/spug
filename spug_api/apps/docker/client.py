import json
import os
import re
import shlex
import subprocess
from io import StringIO
from types import SimpleNamespace
from uuid import uuid4


NAME_RE = re.compile(r'^[A-Za-z0-9][A-Za-z0-9_.-]*$')
ACTIONS = {'publish', 'rebuild', 'restart', 'start', 'stop', 'down', 'logs'}
MAX_CONFIG_SIZE = 1024 * 1024
# 每次操作前都要确认项目仍存在，但 docker inspect 在远程主机上耗时数秒。
# 这里缓存一小段时间，让「读配置 → 看日志 → 操作」这串连续动作只付一次发现成本。
DISCOVER_CACHE_TTL = 20


def cache_key(host_id):
    return f'spug:docker:projects:{host_id if host_id else "local"}'


def _cached_projects(host):
    from django.core.cache import cache
    return cache.get(cache_key(host.id if host else None))


def _store_projects(host, projects):
    from django.core.cache import cache
    cache.set(cache_key(host.id if host else None), projects, DISCOVER_CACHE_TTL)


def invalidate_projects(host):
    from django.core.cache import cache
    cache.delete(cache_key(host.id if host else None))


class DockerClientError(Exception):
    pass


def _safe_name(value, label):
    value = (value or '').strip()
    if not NAME_RE.fullmatch(value):
        raise DockerClientError(f'{label}格式无效')
    return value


def _safe_workdir(value):
    value = (value or '').strip()
    if not value or not os.path.isabs(value) or '\x00' in value:
        raise DockerClientError('工作目录必须是绝对路径')
    value = os.path.normpath(value)
    if value == '/':
        raise DockerClientError('不能使用根目录作为项目工作目录')
    return value


def _config_files(labels):
    raw = labels.get('com.docker.compose.project.config_files') or ''
    return [item.strip() for item in raw.split(',') if item.strip() and os.path.isabs(item.strip())]


def _ports(item):
    result = []
    for target, bindings in (item.get('NetworkSettings', {}).get('Ports') or {}).items():
        for binding in bindings or []:
            host_ip = binding.get('HostIp') or ''
            host_port = binding.get('HostPort') or ''
            result.append(f'{host_ip}:{host_port}:{target}' if host_ip else f'{host_port}:{target}')
    return result


def parse_docker_inspect(output):
    try:
        items = json.loads((output or '').strip() or '[]')
    except json.JSONDecodeError as exc:
        raise DockerClientError(f'Docker 容器信息解析失败: {exc}') from exc
    projects = {}
    for item in items:
        config = item.get('Config') or {}
        labels = config.get('Labels') or {}
        name = labels.get('com.docker.compose.project')
        service = labels.get('com.docker.compose.service')
        workdir = labels.get('com.docker.compose.project.working_dir') or ''
        files = _config_files(labels)
        if not name or not service or not files:
            continue
        key = (name, workdir, tuple(files))
        project = projects.setdefault(key, {
            'name': name,
            'workdir': workdir,
            'config_file': files[0],
            'config_files': files,
            'containers': [],
        })
        project['containers'].append({
            'name': (item.get('Name') or '').lstrip('/'),
            'service': service,
            'state': (item.get('State') or {}).get('Status') or '',
            'image': config.get('Image') or '',
            'ports': _ports(item),
        })
    result = []
    for project in projects.values():
        project['containers'].sort(key=lambda value: (value['service'], value['name']))
        result.append(project)
    result.sort(key=lambda value: value['name'])
    return result


def _run_local(command, timeout):
    try:
        process = subprocess.run(
            command, shell=True, stdout=subprocess.PIPE, stderr=subprocess.STDOUT,
            text=True, timeout=timeout,
        )
    except subprocess.TimeoutExpired as exc:
        raise DockerClientError('Docker 操作执行超时') from exc
    return process.returncode, process.stdout or ''


def _run(host, command, timeout=900, ssh=None):
    if host is None:
        return _run_local(command, timeout)
    wrapped = f'timeout {int(timeout)}s sh -c {shlex.quote(command)}'
    if ssh is not None:
        return ssh.exec_command_raw(wrapped)
    try:
        with host.get_ssh() as client:
            return client.exec_command_raw(wrapped)
    except Exception as exc:
        raise DockerClientError(f'SSH 执行失败: {exc}') from exc


def discover_projects(host=None, ssh=None, use_cache=False):
    if use_cache:
        cached = _cached_projects(host)
        if cached is not None:
            return cached
    command = "ids=$(docker ps -aq); if [ -z \"$ids\" ]; then printf '[]'; else docker inspect $ids; fi"
    code, output = _run(host, command, 60, ssh)
    if code:
        raise DockerClientError(output or '无法读取 Docker 容器列表')
    projects = parse_docker_inspect(output)
    _store_projects(host, projects)
    return projects


def validate_project_ref(projects, project_name, config_file):
    for item in projects:
        files = item.get('config_files') or [item.get('config_file')]
        if item.get('name') == project_name and config_file in files:
            return SimpleNamespace(**item)
    raise DockerClientError('Compose 项目已变化，请刷新服务器 Docker 列表后重试')


def get_project(host, project_name, config_file, ssh=None, use_cache=True):
    return validate_project_ref(
        discover_projects(host, ssh, use_cache), project_name, config_file)


def _compose_base(project):
    name = _safe_name(project.name, 'Compose 项目标识')
    workdir = project.workdir
    if not workdir or not os.path.isabs(workdir):
        raise DockerClientError('Compose 工作目录无效')
    files = getattr(project, 'config_files', None) or [project.config_file]
    if not files or any(not value or not os.path.isabs(value) for value in files):
        raise DockerClientError('Compose 配置路径无效')
    file_args = ' '.join(f'-f {shlex.quote(value)}' for value in files)
    compose = f'docker compose -p {shlex.quote(name)} {file_args}'
    return f'cd {shlex.quote(workdir)} && {compose}', compose


def build_compose_command(project, action, service=None, tail=200):
    if action not in ACTIONS:
        raise DockerClientError('不支持的 Docker 操作')
    if service:
        service = _safe_name(service, '服务名称')
    base, compose = _compose_base(project)
    suffix = f' {shlex.quote(service)}' if service else ''
    if action == 'publish':
        return f'{base} pull{suffix} && {compose} up -d --remove-orphans{suffix}'
    if action == 'rebuild':
        return f'{base} up -d --build --force-recreate{suffix}'
    if action == 'restart':
        return f'{base} restart{suffix}'
    if action == 'start':
        return f'{base} start{suffix}'
    if action == 'stop':
        return f'{base} stop{suffix}'
    if action == 'down':
        return f'{base} down'
    tail = max(20, min(int(tail or 200), 2000))
    return f'{base} logs --no-color --tail {tail}{suffix}'


def read_config(host, project_name, config_file):
    path = config_file
    try:
        if host is None:
            project = get_project(host, project_name, config_file)
            with open(path, 'r', encoding='utf-8') as file:
                content = file.read(MAX_CONFIG_SIZE + 1)
        else:
            # 单条连接内完成校验和读取：建连本身约 3 秒，分两次会直接翻倍。
            with host.get_ssh() as ssh:
                project = get_project(host, project_name, config_file, ssh)
                with ssh.get_client().open_sftp().open(path, 'r') as file:
                    content = file.read(MAX_CONFIG_SIZE + 1)
                    if isinstance(content, bytes):
                        content = content.decode('utf-8')
    except DockerClientError:
        raise
    except Exception as exc:
        raise DockerClientError(f'读取 Compose 配置失败: {exc}') from exc
    if len(content) > MAX_CONFIG_SIZE:
        raise DockerClientError('Compose 配置超过 1 MB，无法在线编辑')
    return {'project': project.__dict__, 'content': content}


def _validate_command(project, selected_file, temp_file):
    files = [temp_file if item == selected_file else item for item in project.config_files]
    temporary = SimpleNamespace(
        name=project.name, workdir=project.workdir,
        config_file=files[0], config_files=files,
    )
    base, _ = _compose_base(temporary)
    return f'{base} config -q'


def save_config(host, project_name, config_file, content):
    if len((content or '').encode('utf-8')) > MAX_CONFIG_SIZE:
        raise DockerClientError('Compose 配置超过 1 MB，无法保存')
    temp_file = f'{config_file}.spug-{uuid4().hex}.tmp'
    try:
        if host is None:
            project = get_project(host, project_name, config_file)
            validate = _validate_command(project, config_file, temp_file)
            original_stat = os.stat(config_file)
            descriptor = os.open(temp_file, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
            with os.fdopen(descriptor, 'w', encoding='utf-8') as file:
                file.write(content)
            code, output = _run_local(validate, 60)
            if code:
                raise DockerClientError(output or 'Compose 配置校验失败')
            os.replace(temp_file, config_file)
            os.chmod(config_file, original_stat.st_mode)
            try:
                os.chown(config_file, original_stat.st_uid, original_stat.st_gid)
            except PermissionError:
                pass
        else:
            with host.get_ssh() as ssh:
                project = get_project(host, project_name, config_file, ssh)
                validate = _validate_command(project, config_file, temp_file)
                code, metadata = ssh.exec_command_raw(
                    f"stat -c '%a %u %g' -- {shlex.quote(config_file)}")
                if code:
                    raise DockerClientError(metadata or '无法读取 Compose 文件权限')
                mode, uid, gid = metadata.strip().split()
                ssh.put_file_by_fl(StringIO(content), temp_file)
                code, output = ssh.exec_command_raw(
                    f'chmod 600 -- {shlex.quote(temp_file)} && '
                    f'timeout 60s sh -c {shlex.quote(validate)}')
                if code:
                    ssh.exec_command_raw(f'rm -f -- {shlex.quote(temp_file)}')
                    raise DockerClientError(output or 'Compose 配置校验失败')
                code, output = ssh.exec_command_raw(
                    f'mv -- {shlex.quote(temp_file)} {shlex.quote(config_file)} && '
                    f'chmod {shlex.quote(mode)} -- {shlex.quote(config_file)} && '
                    f'chown {shlex.quote(uid)}:{shlex.quote(gid)} -- {shlex.quote(config_file)}')
                if code:
                    ssh.exec_command_raw(f'rm -f -- {shlex.quote(temp_file)}')
                    raise DockerClientError(output or 'Compose 配置保存失败')
    finally:
        if host is None and os.path.exists(temp_file):
            os.remove(temp_file)
    return {'content': content}


def remove_project(host, project_name, config_file, delete_files=False):
    """停止并移除项目的容器、网络与数据卷。

    delete_files 为真时连同 compose.yaml 一并删除，否则保留配置，
    便于之后原地重新启动。
    """
    project = get_project(host, project_name, config_file, use_cache=False)
    base, _ = _compose_base(project)
    command = f'{base} down --remove-orphans --volumes'
    code, output = _run(host, command, 600)
    if code:
        raise DockerClientError(output or 'Docker Compose 移除失败')
    if delete_files:
        files = ' '.join(shlex.quote(item) for item in project.config_files)
        if host is None:
            for item in project.config_files:
                if os.path.exists(item):
                    os.remove(item)
        else:
            _run(host, f'rm -f -- {files}', 60)
    invalidate_projects(host)
    return {'output': output}


def create_project(host, project_name, workdir, content):
    project_name = _safe_name(project_name, '项目名称')
    if any(item.get('name') == project_name for item in discover_projects(host)):
        raise DockerClientError('项目名称已存在，请使用其他名称')
    workdir = _safe_workdir(workdir)
    if not (content or '').strip():
        raise DockerClientError('请输入 Docker Compose 配置')
    if len(content.encode('utf-8')) > MAX_CONFIG_SIZE:
        raise DockerClientError('Docker Compose 配置超过 1 MB，无法创建')

    config_file = os.path.join(workdir, 'compose.yaml')
    temp_file = f'{config_file}.spug-{uuid4().hex}.tmp'
    project = SimpleNamespace(
        name=project_name, workdir=workdir,
        config_file=temp_file, config_files=[temp_file],
    )
    validate, _ = _compose_base(project)
    validate = f'{validate} config -q'
    final_project = SimpleNamespace(
        name=project_name, workdir=workdir,
        config_file=config_file, config_files=[config_file],
    )
    start, compose = _compose_base(final_project)
    start = f'{start} up -d'
    down = f'cd {shlex.quote(workdir)} && {compose} down --remove-orphans'

    if host is None:
        os.makedirs(workdir, exist_ok=True)
        if os.path.exists(config_file):
            raise DockerClientError('该目录已存在 compose.yaml，请改用其他目录')
        try:
            descriptor = os.open(temp_file, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
            with os.fdopen(descriptor, 'w', encoding='utf-8') as file:
                file.write(content)
            code, output = _run_local(validate, 60)
            if code:
                raise DockerClientError(output or 'Docker Compose 配置校验失败')
            try:
                os.link(temp_file, config_file)
            except FileExistsError as exc:
                raise DockerClientError('该目录已存在 compose.yaml，请改用其他目录') from exc
            os.remove(temp_file)
            code, output = _run_local(start, 900)
            if code:
                rollback_code, rollback_output = _run_local(down, 120)
                if rollback_code == 0:
                    os.remove(config_file)
                detail = output or 'Docker Compose 启动失败'
                if rollback_code:
                    detail += f'；自动回滚失败：{rollback_output}'
                raise DockerClientError(detail)
        finally:
            if os.path.exists(temp_file):
                os.remove(temp_file)
    else:
        try:
            with host.get_ssh() as ssh:
                prepare = (
                    f'mkdir -p -- {shlex.quote(workdir)} && '
                    f'test ! -e {shlex.quote(config_file)}')
                code, output = ssh.exec_command_raw(prepare)
                if code:
                    raise DockerClientError('该目录已存在 compose.yaml，请改用其他目录')
                ssh.put_file_by_fl(StringIO(content), temp_file)
                code, output = ssh.exec_command_raw(
                    f'chmod 600 -- {shlex.quote(temp_file)} && '
                    f'timeout 60s sh -c {shlex.quote(validate)}')
                if code:
                    raise DockerClientError(output or 'Docker Compose 配置校验失败')
                code, output = ssh.exec_command_raw(
                    f'ln -- {shlex.quote(temp_file)} {shlex.quote(config_file)} && '
                    f'rm -f -- {shlex.quote(temp_file)}')
                if code:
                    raise DockerClientError('该目录已存在 compose.yaml，请改用其他目录')
                code, output = ssh.exec_command_raw(
                    f'timeout 900s sh -c {shlex.quote(start)}')
                if code:
                    rollback_code, rollback_output = ssh.exec_command_raw(
                        f'timeout 120s sh -c {shlex.quote(down)}')
                    if rollback_code == 0:
                        ssh.exec_command_raw(f'rm -f -- {shlex.quote(config_file)}')
                    detail = output or 'Docker Compose 启动失败'
                    if rollback_code:
                        detail += f'；自动回滚失败：{rollback_output}'
                    raise DockerClientError(detail)
        except DockerClientError:
            raise
        except Exception as exc:
            raise DockerClientError(f'创建项目失败：{exc}') from exc
        finally:
            try:
                with host.get_ssh() as ssh:
                    ssh.exec_command_raw(f'rm -f -- {shlex.quote(temp_file)}')
            except Exception:
                pass
    invalidate_projects(host)
    return {
        'name': project_name,
        'workdir': workdir,
        'config_file': config_file,
        'output': output,
    }


# 镜像/网络/存储卷管理：只暴露固定的只读与清理动作，不开放任意 docker 子命令。
RESOURCE_KINDS = {
    'images': 'image',
    'networks': 'network',
    'volumes': 'volume',
}
RESOURCE_ACTIONS = {'list', 'remove', 'prune'}
# 资源标识允许镜像名中的斜杠、冒号和 @sha256 摘要，但不允许任何 shell 元字符。
RESOURCE_TARGET_RE = re.compile(r'^[A-Za-z0-9][A-Za-z0-9_.:/@-]*$')


def build_resource_command(kind, action, target=None, force=False):
    noun = RESOURCE_KINDS.get(kind)
    if not noun:
        raise DockerClientError('不支持的 Docker 资源类型')
    if action not in RESOURCE_ACTIONS:
        raise DockerClientError('不支持的 Docker 资源操作')
    if action == 'list':
        extra = ' --all' if kind == 'images' else ''
        return f"docker {noun} ls{extra} --format '{{{{json .}}}}'"
    if action == 'prune':
        # 网络与存储卷的 prune 只清理未被引用的对象，镜像仅清理悬空层。
        return f'docker {noun} prune -f'
    if not target:
        raise DockerClientError('请选择要删除的对象')
    if not RESOURCE_TARGET_RE.fullmatch(target) or len(target) > 255:
        raise DockerClientError('对象标识格式无效')
    flag = ' -f' if force and kind == 'images' else ''
    return f'docker {noun} rm{flag} -- {target}'


def parse_resource_list(output, kind):
    items = []
    for line in (output or '').splitlines():
        line = line.strip()
        if not line:
            continue
        try:
            data = json.loads(line)
        except json.JSONDecodeError as exc:
            raise DockerClientError(f'Docker 资源信息解析失败: {exc}') from exc
        if kind == 'images':
            repository = data.get('Repository') or '<none>'
            tag = data.get('Tag') or '<none>'
            items.append({
                'id': data.get('ID') or '',
                'name': f'{repository}:{tag}',
                'size': data.get('Size') or '',
                'created': data.get('CreatedSince') or '',
                'dangling': repository == '<none>' or tag == '<none>',
            })
        elif kind == 'networks':
            items.append({
                'id': data.get('ID') or '',
                'name': data.get('Name') or '',
                'driver': data.get('Driver') or '',
                'scope': data.get('Scope') or '',
            })
        else:
            name = data.get('Name') or ''
            items.append({
                'id': name,
                'name': name,
                'driver': data.get('Driver') or '',
                'mountpoint': data.get('Mountpoint') or '',
            })
    return items


def manage_resource(host, kind, action, target=None, force=False):
    command = build_resource_command(kind, action, target, force)
    code, output = _run(host, command, 300)
    if code:
        raise DockerClientError(output or 'Docker 资源操作失败')
    if action == 'list':
        return {'items': parse_resource_list(output, kind)}
    invalidate_projects(host)
    return {'output': output}


def execute(host, project_name, config_file, action, service=None, tail=200):
    if host is None:
        project = get_project(host, project_name, config_file)
        command = build_compose_command(project, action, service, tail)
        code, output = _run(host, command)
    else:
        # 校验与执行共用一条 SSH 连接，避免每次操作重复付出建连成本。
        try:
            with host.get_ssh() as ssh:
                project = get_project(host, project_name, config_file, ssh)
                command = build_compose_command(project, action, service, tail)
                code, output = _run(host, command, 900, ssh)
        except DockerClientError:
            raise
        except Exception as exc:
            raise DockerClientError(f'SSH 执行失败: {exc}') from exc
    if code:
        raise DockerClientError(output or f'Docker 操作失败，退出码 {code}')
    if action != 'logs':
        invalidate_projects(host)
    return {'output': output}
