# Copyright: (c) OpenSpug Organization. https://github.com/openspug/spug
# Copyright: (c) <spug.dev@gmail.com>
# Released under the AGPL-3.0 License.
from queue import Queue
from threading import Thread
from libs.ssh import AuthenticationException
from apps.host.models import Host
from django.db import close_old_connections
import subprocess
import socket
import time


def local_executor(q, command):
    exit_code, out, now = -1, None, time.time()
    try:
        task = subprocess.Popen(command, shell=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        exit_code = task.wait()
        out = task.stdout.read() + task.stderr.read()
    finally:
        q.put(('local', exit_code, round(time.time() - now, 3), out.decode()))


def host_executor(q, host, command):
    exit_code, out, now = -1, None, time.time()
    try:
        cli = host.get_ssh()
        exit_code, out = cli.exec_command(command)
        out = out if out else None
    except AuthenticationException:
        out = 'ssh authentication fail'
    except socket.error as e:
        out = f'network error {e}'
    finally:
        q.put((host.id, exit_code, round(time.time() - now, 3), out))


def dispatch(command, targets, in_view=False):
    if not in_view:
        close_old_connections()
    threads, q = [], Queue()
    for t in targets:
        if t == 'local':
            threads.append(Thread(target=local_executor, args=(q, command)))
        elif isinstance(t, int):
            host = Host.objects.filter(pk=t).first()
            if not host:
                raise ValueError(f'unknown host id: {t!r}')
            threads.append(Thread(target=host_executor, args=(q, host, command)))
        else:
            raise ValueError(f'invalid target: {t!r}')
    for t in threads:
        t.start()
    return [q.get() for _ in threads]
