# Copyright: (c) OpenSpug Organization. https://github.com/openspug/spug
# Copyright: (c) <spug.dev@gmail.com>
# Released under the AGPL-3.0 License.
from apps.host.models import Host
from socket import socket
import requests
import logging

logging.captureWarnings(True)


def site_check(url):
    try:
        res = requests.get(url, timeout=10, verify=False)
        return 200 <= res.status_code < 400, f'返回状态码：{res.status_code}'
    except Exception as e:
        return False, f'异常信息：{e}'


def port_check(addr, port):
    try:
        sock = socket()
        sock.settimeout(5)
        sock.connect((addr, int(port)))
        return True, '端口状态检测正常'
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


def dispatch(tp, addr, extra):
    if tp == '1':
        return site_check(addr)
    elif tp == '2':
        return port_check(addr, extra)
    elif tp == '3':
        command = f'ps -ef|grep -v grep|grep {extra!r}'
    elif tp == '4':
        command = extra
    else:
        raise TypeError(f'invalid monitor type: {tp!r}')
    host = Host.objects.filter(pk=addr).first()
    return host_executor(host, command)
