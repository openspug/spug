# Copyright: (c) OpenSpug Organization. https://github.com/openspug/spug
# Copyright: (c) <spug.dev@gmail.com>
# Released under the MIT License.
from channels.consumer import SyncConsumer
from apps.setting.utils import AppSetting
from django_redis import get_redis_connection
from libs.ssh import SSH
import threading
import socket
import json


class SSHExecutor(SyncConsumer):
    def exec(self, job):
        pkey = AppSetting.get('private_key')
        job = Job(pkey=pkey, **job)
        threading.Thread(target=job.run).start()


class Job:
    def __init__(self, hostname, port, username, pkey, command, token=None, **kwargs):
        self.ssh_cli = SSH(hostname, port, username, pkey)
        self.key = f'{hostname}:{port}'
        self.command = command
        self.token = token
        self.rds_cli = None

    def _send(self, message, with_expire=False):
        if self.rds_cli is None:
            self.rds_cli = get_redis_connection()
        self.rds_cli.rpush(self.token, json.dumps(message))
        if with_expire:
            self.rds_cli.expire(self.token, 300)

    def send(self, data):
        message = {'key': self.key, 'type': 'info', 'data': data}
        self._send(message)

    def send_system(self, data):
        message = {'key': self.key, 'type': 'system', 'data': data}
        self._send(message)

    def send_error(self, data):
        message = {'key': self.key, 'type': 'error', 'data': data}
        self._send(message)

    def send_status(self, code):
        message = {'key': self.key, 'status': code}
        self._send(message, True)

    def run(self):
        if not self.token:
            return self.ssh_cli.exec_command(self.command)
        self.send_system('### Executing')
        code = -1
        try:
            for code, out in self.ssh_cli.exec_command_with_stream(self.command):
                self.send(out)
        except socket.timeout:
            code = 130
            self.send_error('### Time out')
        finally:
            self.send_status(code)
