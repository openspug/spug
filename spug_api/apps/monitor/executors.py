# Copyright: (c) OpenSpug Organization. https://github.com/openspug/spug
# Copyright: (c) <spug.dev@gmail.com>
# Released under the AGPL-3.0 License.
from django_redis import get_redis_connection
from apps.host.models import Host
from apps.monitor.utils import handle_notify
from socket import socket
import subprocess
import platform
import requests
import logging
import json
import time
import re

logging.captureWarnings(True)
regex = re.compile(r'Failed to establish a new connection: (.*)\'\)+')


def site_check(url, limit):
    try:
        res = requests.get(url, timeout=30)
        if limit:
            duration = int(res.elapsed.total_seconds() * 1000)
            if duration > int(limit):
                return False, f'响应时间 {duration}ms 大于 {limit}ms'
        return 200 <= res.status_code < 400, f'返回HTTP状态码 {res.status_code}'
    except Exception as e:
        error = e.__str__()
        exps = re.findall(regex, error)
        if exps:
            error = exps[0]
        return False, error


def port_check(addr, port):
    try:
        sock = socket()
        sock.settimeout(5)
        sock.connect((addr, int(port)))
        sock.close()
        return True, '端口状态检测正常'
    except Exception as e:
        return False, f'异常信息：{e}'


def ping_check(addr):
    try:
        if platform.system().lower() == 'windows':
            command = f'ping -n 1 -w 3000 {addr}'
        else:
            command = f'ping -c 1 -W 3 {addr}'
        task = subprocess.run(command, shell=True, stdout=subprocess.PIPE)
        if task.returncode == 0:
            return True, 'Ping检测正常'
        else:
            return False, 'Ping检测失败'
    except Exception as e:
        return False, f'异常信息：{e}'


def host_executor(host, command):
    try:
        with host.get_ssh() as ssh:
            exit_code, out = ssh.exec_command_raw(command)
        if exit_code == 0:
            return True, out or '检测状态正常'
        else:
            return False, out or f'退出状态码：{exit_code}'
    except Exception as e:
        return False, f'异常信息：{e}'


def monitor_worker_handler(job):
    task_id, tp, addr, extra, threshold, quiet = json.loads(job)
    target = addr
    if tp == '1':
        is_ok, message = site_check(addr, extra)
    elif tp == '2':
        is_ok, message = port_check(addr, extra)
    elif tp == '5':
        is_ok, message = ping_check(addr)
    elif tp not in ('3', '4'):
        is_ok, message = False, f'invalid monitor type for {tp!r}'
    else:
        command = f'ps -ef|grep -v grep|grep {extra!r}' if tp == '3' else extra
        host = Host.objects.filter(pk=addr).first()
        if not host:
            is_ok, message = False, f'unknown host id for {addr!r}'
        else:
            is_ok, message = host_executor(host, command)
        target = f'{host.name}({host.hostname})'

    rds, key, f_count, f_time = get_redis_connection(), f'spug:det:{task_id}', f'c_{addr}', f't_{addr}'
    v_count, v_time = rds.hmget(key, f_count, f_time)
    if is_ok:
        if v_count:
            rds.hdel(key, f_count, f_time)
        if v_time:
            logging.warning('send recovery notification')
            handle_notify(task_id, target, is_ok, message, int(v_count) + 1)
        return
    v_count = rds.hincrby(key, f_count)
    if v_count >= threshold:
        if not v_time or int(time.time()) - int(v_time) >= quiet * 60:
            rds.hset(key, f_time, int(time.time()))
            logging.warning('send fault alarm notification')
            handle_notify(task_id, target, is_ok, message, v_count)


def dispatch(tp, addr, extra):
    if tp == '1':
        return site_check(addr, extra)
    elif tp == '2':
        return port_check(addr, extra)
    elif tp == '5':
        return ping_check(addr)
    elif tp == '3':
        command = f'ps -ef|grep -v grep|grep {extra!r}'
    elif tp == '4':
        command = extra
    else:
        raise TypeError(f'invalid monitor type: {tp!r}')
    host = Host.objects.filter(pk=addr).first()
    return host_executor(host, command)
