import json
import os
import re
import shlex
import socket
import subprocess
import time
from io import StringIO
from types import SimpleNamespace
from uuid import uuid4


NAME_RE = re.compile(r'^[A-Za-z0-9][A-Za-z0-9_.-]*$')
ACTIONS = {'publish', 'rebuild', 'restart', 'start', 'stop', 'down', 'logs'}
MAX_CONFIG_SIZE = 1024 * 1024
# 每次操作前都要确认项目仍存在，但 docker inspect 在远程主机上耗时数秒。
# 这里缓存一小段时间，让「读配置 → 看日志 → 操作」这串连续动作只付一次发现成本。
DISCOVER_CACHE_TTL = 20
# 首屏展示用的长效缓存：容忍数据略旧，但要让切换服务器时立刻出列表，
# 真实结果由前端后台刷新覆盖。执行类操作绝不读这份缓存。
VIEW_CACHE_TTL = 1800


def cache_key(host_id):
    # v2：缓存内容从「项目列表」改为「项目 + 独立容器」，换键避免读到旧结构
    return f'spug:docker:inspect:v2:{host_id if host_id else "local"}'


def view_cache_key(host_id):
    return f'{cache_key(host_id)}:view'


def _cached_projects(host, stale_ok=False):
    from django.core.cache import cache
    host_id = host.id if host else None
    return cache.get(view_cache_key(host_id) if stale_ok else cache_key(host_id))


def _store_projects(host, payload):
    from django.core.cache import cache
    host_id = host.id if host else None
    cache.set(cache_key(host_id), payload, DISCOVER_CACHE_TTL)
    cache.set(view_cache_key(host_id), payload, VIEW_CACHE_TTL)


def invalidate_projects(host):
    from django.core.cache import cache
    host_id = host.id if host else None
    cache.delete_many([cache_key(host_id), view_cache_key(host_id)])


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


def parse_inspect(output):
    """把 docker inspect 结果拆成 compose 项目和独立容器两部分。

    只有同时具备 project、service 和 config_files 三个标签的容器才能用
    `docker compose -f <file>` 操作，才归入项目。其余情况有两类：
      - 完全没有 compose 标签：docker run 手工启动的容器；
      - 标签残缺（例如只剩 project/service）：多为手工 --label 或镜像继承。
    它们无法定位 compose 配置，硬塞进项目会让所有 compose 操作报错，甚至
    误导用户对错误的项目执行 down，因此单独归入「独立容器」。
    """
    try:
        items = json.loads((output or '').strip() or '[]')
    except json.JSONDecodeError as exc:
        raise DockerClientError(f'Docker 容器信息解析失败: {exc}') from exc
    projects = {}
    standalone = []
    for item in items:
        config = item.get('Config') or {}
        labels = config.get('Labels') or {}
        name = labels.get('com.docker.compose.project')
        service = labels.get('com.docker.compose.service')
        workdir = labels.get('com.docker.compose.project.working_dir') or ''
        files = _config_files(labels)
        container = {
            'name': (item.get('Name') or '').lstrip('/'),
            'service': service or '',
            'state': (item.get('State') or {}).get('Status') or '',
            'image': config.get('Image') or '',
            'ports': _ports(item),
        }
        if not name or not service or not files:
            standalone.append({
                **container,
                'project': name or '',
                # 残缺标签要显式提示，方便运维回头清理，避免日后 compose
                # 版本变化后这些容器被误纳入同名项目的作用域。
                'partial_labels': bool(name or service),
            })
            continue
        key = (name, workdir, tuple(files))
        project = projects.setdefault(key, {
            'name': name,
            'workdir': workdir,
            'config_file': files[0],
            'config_files': files,
            'containers': [],
        })
        project['containers'].append(container)
    result = []
    for project in projects.values():
        project['containers'].sort(key=lambda value: (value['service'], value['name']))
        result.append(project)
    result.sort(key=lambda value: value['name'])
    standalone.sort(key=lambda value: value['name'])
    return {'projects': result, 'standalone': standalone}


def parse_docker_inspect(output):
    return parse_inspect(output)['projects']


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


def peek_inspect(host):
    """只读缓存，不触发远程发现；没有任何缓存时返回 None。

    先读 20 秒短缓存，再退化到 30 分钟长缓存，仅供界面首屏秒开使用，
    调用方拿到结果后必须再发一次强制刷新覆盖。
    """
    cached = _cached_projects(host, stale_ok=False)
    if cached is None:
        cached = _cached_projects(host, stale_ok=True)
    return cached


def discover_all(host=None, ssh=None, use_cache=False):
    """返回 {'projects': [...], 'standalone': [...]}。"""
    if use_cache:
        cached = _cached_projects(host, stale_ok=False)
        if cached is not None:
            return cached
    command = "ids=$(docker ps -aq); if [ -z \"$ids\" ]; then printf '[]'; else docker inspect $ids; fi"
    code, output = _run(host, command, 60, ssh)
    if code:
        raise DockerClientError(output or '无法读取 Docker 容器列表')
    payload = parse_inspect(output)
    _store_projects(host, payload)
    return payload


def discover_projects(host=None, ssh=None, use_cache=False):
    return discover_all(host, ssh, use_cache)['projects']


def validate_project_ref(projects, project_name, config_file):
    for item in projects:
        files = item.get('config_files') or [item.get('config_file')]
        if item.get('name') == project_name and config_file in files:
            return SimpleNamespace(**item)
    raise DockerClientError('Compose 项目已变化，请刷新服务器 Docker 列表后重试')


def find_name_conflicts(projects, project_name, config_file):
    """返回同名但配置不同的其他项目组。

    Docker Compose 只用项目名（com.docker.compose.project 标签）界定作用域，
    而这里按「名称 + 工作目录 + 配置文件」区分项目。两者不一致时，针对某一组
    执行 down / up 会波及同名的其他容器与共享网络，因此涉及销毁的操作必须
    先检测冲突并中止。
    """
    conflicts = []
    for item in projects:
        if item.get('name') != project_name:
            continue
        files = item.get('config_files') or [item.get('config_file')]
        if config_file in files:
            continue
        conflicts.append(item)
    return conflicts


def _assert_no_name_conflict(projects, project_name, config_file, action):
    conflicts = find_name_conflicts(projects, project_name, config_file)
    if not conflicts:
        return
    detail = '；'.join(
        f"{item.get('workdir') or '未知目录'}（{'、'.join(c['name'] for c in item.get('containers') or [])}）"
        for item in conflicts)
    raise DockerClientError(
        f'检测到同名 Compose 项目「{project_name}」还存在其他配置：{detail}。'
        f'Docker Compose 按项目名界定作用域，继续{action}会同时影响这些容器。'
        f'请先为其中一组改用不同的项目名，再重试。')


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
        # 不加 --remove-orphans：同项目名下不在本配置中的容器会被当作孤儿删除
        return f'{base} pull{suffix} && {compose} up -d{suffix}'
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


# 独立容器（非 compose 管理）开放的动作。
# remove 只删容器本身，不带 --volumes：这类容器没有 compose 配置，删掉就无法
# 在 spug 内重建，连数据卷一起删会让误操作彻底不可逆。卷可以去「存储卷」清理。
CONTAINER_ACTIONS = {'start', 'stop', 'restart', 'logs', 'remove'}
CONTAINER_TIMEOUTS = {'start': 300, 'stop': 300, 'restart': 300, 'logs': 120, 'remove': 300}


def build_container_command(action, name, tail=200):
    if action not in CONTAINER_ACTIONS:
        raise DockerClientError('不支持的容器操作')
    name = _safe_name(name, '容器名称')
    if action == 'logs':
        tail = max(20, min(int(tail or 200), 2000))
        return f'docker logs --tail {tail} -- {shlex.quote(name)}'
    if action == 'remove':
        # -f 允许删除运行中的容器；不加 -v，保留匿名卷
        return f'docker rm -f -- {shlex.quote(name)}'
    return f'docker {action} -- {shlex.quote(name)}'


def execute_container(host, action, name, tail=200):
    """对独立容器执行动作，执行前确认它确实是主机上的独立容器。

    校验目的不是防命令注入（名称已过 NAME_RE），而是避免对 compose 项目内
    的容器绕过项目视图直接操作：compose 会在下次 up 时按自己的记录重建，
    绕过去删只会让项目状态和 compose 记录对不上。
    """
    payload = discover_all(host, use_cache=True)
    if name not in {item['name'] for item in payload['standalone']}:
        raise DockerClientError('容器已变化，请刷新后重试')
    command = build_container_command(action, name, tail)
    code, output = _run(host, command, CONTAINER_TIMEOUTS[action])
    if code:
        raise DockerClientError(output or '容器操作失败')
    if action != 'logs':
        invalidate_projects(host)
    return {'output': output}


# 容器资源采样。
# 不用 `docker stats --no-stream`：它内部要等两次采样，单次实测约 2.5 秒，
# 达不到秒级刷新。改用流式 `docker stats`，docker 自身约每秒吐一帧，
# 一条长连接即可持续供数。
STATS_MAX_DURATION = 1800
STATS_READ_TIMEOUT = 5
# 日志跟随的空闲探测间隔：决定「最后几行多久能推到前端」
IDLE_READ_TIMEOUT = 0.3
ANSI_RE = re.compile(r'\x1b\[[0-9;?]*[A-Za-z]')


def build_stats_command(names):
    if not names:
        raise DockerClientError('没有运行中的容器')
    quoted = ' '.join(shlex.quote(_safe_name(item, '容器名称')) for item in names)
    return f"docker stats --format '{{{{json .}}}}' {quoted}"


def _parse_stats_line(line):
    """解析一行 docker stats 输出，非数据行返回 (None, None)。"""
    line = ANSI_RE.sub('', line).strip()
    if not line.startswith('{'):
        return None, None
    try:
        data = json.loads(line)
    except json.JSONDecodeError:
        return None, None
    name = (data.get('Name') or '').strip()
    if not name:
        return None, None
    return name, {
        'cpu': data.get('CPUPerc') or '',
        'mem': data.get('MemUsage') or '',
        'mem_percent': data.get('MemPerc') or '',
        'net': data.get('NetIO') or '',
        'block': data.get('BlockIO') or '',
        'pids': data.get('PIDs') or '',
    }


def iter_stats_frames(lines, expected=0):
    """把 docker stats 的连续输出切成一帧一帧的 {容器名: 指标}。

    流式模式靠 ANSI 控制序列覆盖上一屏，而这些序列在不同 docker 版本间并不
    一致，所以这里不依赖它们：同一帧内每个容器只会出现一次，凑齐预期数量或
    出现重名即代表本帧结束。容器中途消失时靠重名规则兜底。
    """
    frame = {}
    for line in lines:
        name, item = _parse_stats_line(line)
        if not name:
            continue
        if name in frame:
            yield frame
            frame = {}
        frame[name] = item
        if expected and len(frame) >= expected:
            yield frame
            frame = {}
    if frame:
        yield frame


def _iter_local_lines(command, deadline):
    process = subprocess.Popen(
        command, shell=True, stdout=subprocess.PIPE, stderr=subprocess.STDOUT,
        text=True, bufsize=1)
    try:
        for line in process.stdout:
            yield line
            if time.time() > deadline:
                break
    finally:
        process.kill()
        process.wait()


def _iter_ssh_lines(ssh, command, deadline, idle_signal=False):
    """逐行产出远端命令输出。

    idle_signal 为真时，读取空闲会额外产出一个 None，让调用方有机会把
    攒着的内容下发出去——日志流量忽高忽低，没有这个信号时最后几行会一直
    卡在缓冲里直到下一批日志到来。
    """
    transport = ssh.get_client().get_transport()
    transport.set_keepalive(30)
    channel = transport.open_session()
    channel.set_combine_stderr(True)
    channel.settimeout(IDLE_READ_TIMEOUT if idle_signal else STATS_READ_TIMEOUT)
    channel.exec_command(command)
    buffer = ''
    try:
        while time.time() < deadline:
            try:
                data = channel.recv(8192)
            except socket.timeout:
                if idle_signal:
                    yield None
                continue
            if not data:
                break
            buffer += data.decode('utf-8', 'ignore')
            parts = buffer.split('\n')
            buffer = parts.pop()
            for line in parts:
                yield line
        if buffer:
            yield buffer
    finally:
        try:
            channel.close()
        except Exception:
            # 客户端断开时连接可能已经不可用，清理阶段的报错不应向上冒泡，
            # 否则会掩盖真正的中断原因（GeneratorExit）。
            pass


def _wrap_long_running(command, max_duration):
    """让远端进程随 SSH channel 一起结束。

    仅靠 timeout 兜底是不够的：`docker logs -f` 在容器空闲时不写 stdout，
    channel 关闭既不会触发 SIGPIPE 也收不到 SIGHUP，进程会一直挂到 timeout
    到期（实测残留了整整一小时）。这里再拿 cat 盯着 stdin —— channel 一关
    stdin 立刻 EOF，随即杀掉子进程。
    """
    inner = (f'{command} & child=$!; '
             f'cat >/dev/null 2>&1; '
             f'kill -TERM $child 2>/dev/null; '
             f'wait $child 2>/dev/null')
    return f'timeout {int(max_duration)}s sh -c {shlex.quote(inner)}'


def stream_command_lines(host, command, max_duration, idle_signal=False):
    """在一条长连接上逐行产出命令输出，直到调用方关闭生成器或超时。

    调用方关闭生成器时 GeneratorExit 会传入，触发 finally 关闭 channel 与
    SSH 连接；远端再用 timeout 兜底，确保进程不会残留。
    """
    deadline = time.time() + max_duration
    if host is None:
        yield from _iter_local_lines(command, deadline)
        return
    wrapped = _wrap_long_running(command, max_duration)
    ssh = host.get_ssh()
    try:
        ssh.__enter__()
    except Exception as exc:
        raise DockerClientError(f'SSH 连接失败: {exc}') from exc
    try:
        yield from _iter_ssh_lines(ssh, wrapped, deadline, idle_signal)
    except (DockerClientError, GeneratorExit):
        raise
    except Exception as exc:
        raise DockerClientError(f'SSH 执行失败: {exc}') from exc
    finally:
        # 不用 with：调用方关闭生成器时 __exit__ 自身也可能抛错，
        # 那会盖掉 GeneratorExit 让 Django 记录成一次假故障。
        try:
            ssh.__exit__(None, None, None)
        except Exception:
            pass


def stream_stats(host, names, max_duration=STATS_MAX_DURATION):
    """持续产出容器资源占用帧，直到调用方关闭生成器或达到时限。"""
    command = build_stats_command(names)
    yield from iter_stats_frames(
        stream_command_lines(host, command, max_duration), len(names))


# 日志跟随。上限比资源采样长：盯日志排障往往要持续很久，
# 到点后前端会自动重连，不会真的中断观察。
LOGS_MAX_DURATION = 3600


def build_logs_follow_command(project, service=None, tail=200):
    """compose 项目的日志跟随命令。"""
    base, _ = _compose_base(project)
    suffix = f' {shlex.quote(_safe_name(service, "服务名称"))}' if service else ''
    tail = max(20, min(int(tail or 200), 2000))
    return f'{base} logs --no-color --follow --tail {tail}{suffix}'


def build_container_logs_follow_command(name, tail=200):
    """独立容器的日志跟随命令。"""
    name = _safe_name(name, '容器名称')
    tail = max(20, min(int(tail or 200), 2000))
    return f'docker logs --follow --tail {tail} -- {shlex.quote(name)}'


def stream_logs(host, command, max_duration=LOGS_MAX_DURATION):
    yield from stream_command_lines(host, command, max_duration, idle_signal=True)


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
    projects = discover_projects(host, use_cache=False)
    project = validate_project_ref(projects, project_name, config_file)
    # 同名项目共享 compose 作用域，删除会波及对方，必须先中止
    _assert_no_name_conflict(projects, project_name, config_file, '删除')
    base, _ = _compose_base(project)
    # 不加 --remove-orphans：该参数会删除「同项目名但不在本配置内」的容器
    command = f'{base} down --volumes'
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
    # 回滚同样不加 --remove-orphans，避免连带删除同项目名下的其他容器
    down = f'cd {shlex.quote(workdir)} && {compose} down'

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
    # down 会销毁容器与共享网络，同名项目下必须先确认没有其他配置组
    guarded = action == 'down'
    if host is None:
        projects = discover_projects(host, use_cache=not guarded)
        project = validate_project_ref(projects, project_name, config_file)
        if guarded:
            _assert_no_name_conflict(projects, project_name, config_file, '停止并移除')
        command = build_compose_command(project, action, service, tail)
        code, output = _run(host, command)
    else:
        # 校验与执行共用一条 SSH 连接，避免每次操作重复付出建连成本。
        try:
            with host.get_ssh() as ssh:
                projects = discover_projects(host, ssh, use_cache=not guarded)
                project = validate_project_ref(projects, project_name, config_file)
                if guarded:
                    _assert_no_name_conflict(projects, project_name, config_file, '停止并移除')
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
