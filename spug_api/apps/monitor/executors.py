# Copyright: (c) OpenSpug Organization. https://github.com/openspug/spug
# Copyright: (c) <spug.dev@gmail.com>
# Released under the AGPL-3.0 License.
from django.db import close_old_connections
from apps.host.models import Host
from socket import socket
import subprocess
import platform
import requests
import logging
import json

logging.captureWarnings(True)


def site_check(url, limit):
    try:
        res = requests.get(url, timeout=10, verify=False)
        if limit:
            duration = int(res.elapsed.total_seconds() * 1000)
            if duration > int(limit):
                return False, f'响应时间：{duration}ms'
        return 200 <= res.status_code < 400, f'返回状态码：{res.status_code}'
    except Exception as e:
        return False, f'异常信息：{e}'


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
        cli = host.get_ssh()
        exit_code, out = cli.exec_command(command)
        if exit_code == 0:
            return True, out or '检测状态正常'
        else:
            return False, out or f'退出状态码：{exit_code}'
    except Exception as e:
        return False, f'异常信息：{e}'


def monitor_worker_handler(job):
    print('enter: ', job)
    task_id, tp, addr, extra = json.loads(job)
    if tp == '1':
        is_ok, message = site_check(addr, extra)
    elif tp == '2':
        is_ok, message = port_check(addr, extra)
    elif tp == '5':
        is_ok, message = ping_check(addr)
    elif tp not in ('3', '4'):
        is_ok, message = False, f'invalid monitor type for {tp!r}'
    else:
        close_old_connections()
        command = f'ps -ef|grep -v grep|grep {extra!r}' if tp == '3' else extra
        host = Host.objects.filter(pk=addr).first()
        if not host:
            is_ok, message = False, f'unknown host id for {addr!r}'
        else:
            is_ok, message = host_executor(host, command)


    # is_notified = True if obj.latest_notify_time else False
    # if obj.latest_status in [0, None] and is_ok is False:
    #     obj.latest_fault_time = int(time.time())
    # if is_ok:
    #     obj.latest_notify_time = 0
    #     obj.fault_times = 0
    # else:
    #     obj.fault_times += 1
    # obj.latest_status = 0 if is_ok else 1
    # obj.latest_run_time = human_datetime(event.scheduled_run_time)
    # obj.save()
    # self._handle_notify(obj, is_notified, out)

def dispatch(tp, addr, extra):
    if tp == '1':
        return site_check(addr)
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
