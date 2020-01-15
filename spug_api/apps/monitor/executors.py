# Copyright: (c) OpenSpug Organization. https://github.com/openspug/spug
# Copyright: (c) <spug.dev@gmail.com>
# Released under the MIT License.
from libs.ssh import SSH
from apps.host.models import Host
from apps.setting.utils import AppSetting
from socket import socket
import requests
import logging

logging.captureWarnings(True)


def site_check(url):
    status_code = -1
    try:
        res = requests.get(url, timeout=10, verify=False)
        status_code = res.status_code
    finally:
        return status_code == 200


def port_check(addr, port):
    sock = socket()
    sock.settimeout(5)
    return sock.connect_ex((addr, int(port))) == 0


def host_executor(host, pkey, command):
    exit_code = -1
    try:
        cli = SSH(host.hostname, host.port, host.username, pkey=pkey)
        exit_code, _ = cli.exec_command(command)
    finally:
        return exit_code == 0


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
    pkey = AppSetting.get('private_key')
    host = Host.objects.filter(pk=addr).first()
    return host_executor(host, pkey, command)
