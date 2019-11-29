from queue import Queue
from threading import Thread
from libs.ssh import SSH
from apps.host.models import Host
from apps.setting.utils import AppSetting
import subprocess


def local_executor(q, command):
    exit_code, out = -1, None
    try:
        task = subprocess.Popen(command, shell=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        exit_code = task.wait()
        out = task.stdout.read() + task.stderr.read()
    finally:
        q.put(('local', exit_code, out.decode()))


def host_executor(q, host, pkey, command):
    exit_code, out = -1, None
    try:
        cli = SSH(host.hostname, host.port, host.username, pkey=pkey)
        exit_code, out = cli.exec_command(command)
    finally:
        q.put((host.id, exit_code, out.decode()))


def dispatch(command, targets):
    threads, pkey, q = [], AppSetting.get('private_key'), Queue()
    for t in targets:
        if t == 'local':
            threads.append(Thread(target=local_executor, args=(q, command)))
        elif isinstance(t, int):
            host = Host.objects.filter(pk=t).first()
            if not host:
                raise ValueError(f'unknown host id: {t!r}')
            threads.append(Thread(target=host_executor, args=(q, host, pkey, command)))
        else:
            raise ValueError(f'invalid target: {t!r}')
    for t in threads:
        t.start()
    return [q.get() for _ in threads]
