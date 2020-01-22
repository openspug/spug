# Copyright: (c) OpenSpug Organization. https://github.com/openspug/spug
# Copyright: (c) <spug.dev@gmail.com>
# Released under the MIT License.
from queue import Queue
from threading import Thread
from libs.ssh import SSH
from apps.host.models import Host
from apps.setting.utils import AppSetting
from django.db import close_old_connections
import subprocess
import time


def local_executor(q, command):
    exit_code, out, now = -1, None, time.time()
    try:
        task = subprocess.Popen(command, shell=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        exit_code = task.wait()
        out = task.stdout.read() + task.stderr.read()
    finally:
        q.put(('local', exit_code, round(time.time() - now, 3), out.decode()))


def host_executor(q, host, pkey, command):
    exit_code, out, now = -1, None, time.time()
    try:
        cli = SSH(host.hostname, host.port, host.username, pkey=pkey)
        exit_code, out = cli.exec_command(command)
    finally:
        q.put((host.id, exit_code, round(time.time() - now, 3), out.decode() if out else None))


def dispatch(command, targets):
    close_old_connections()
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
