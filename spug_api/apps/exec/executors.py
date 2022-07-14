# Copyright: (c) OpenSpug Organization. https://github.com/openspug/spug
# Copyright: (c) <spug.dev@gmail.com>
# Released under the AGPL-3.0 License.
from django_redis import get_redis_connection
from libs.utils import human_seconds_time
from libs.ssh import SSH
import threading
import socket
import json
import time


def exec_worker_handler(job):
    job = Job(**json.loads(job))
    threading.Thread(target=job.run).start()


class Job:
    def __init__(self, key, name, hostname, port, username, pkey, command, interpreter, params=None, token=None,
                 term=None):
        self.ssh = SSH(hostname, port, username, pkey, term=term)
        self.key = key
        self.command = self._handle_command(command, interpreter)
        self.token = token
        self.rds = get_redis_connection()
        self.env = dict(
            SPUG_HOST_ID=str(self.key),
            SPUG_HOST_NAME=name,
            SPUG_HOST_HOSTNAME=hostname,
            SPUG_SSH_PORT=str(port),
            SPUG_SSH_USERNAME=username,
            SPUG_INTERPRETER=interpreter
        )
        if isinstance(params, dict):
            self.env.update({f'_SPUG_{k}': str(v) for k, v in params.items()})

    def _send(self, message):
        self.rds.publish(self.token, json.dumps(message))

    def _handle_command(self, command, interpreter):
        if interpreter == 'python':
            attach = 'INTERPRETER=python\ncommand -v python3 &> /dev/null && INTERPRETER=python3'
            return f'{attach}\n$INTERPRETER << EOF\n# -*- coding: UTF-8 -*-\n{command}\nEOF'
        return command

    def send(self, data):
        self._send({'key': self.key, 'data': data})

    def send_status(self, code):
        self._send({'key': self.key, 'status': code})

    def run(self):
        if not self.token:
            with self.ssh:
                return self.ssh.exec_command(self.command, self.env)
        flag = time.time()
        self.send('\r\n\x1b[36m### Executing ...\x1b[0m\r\n')
        code = -1
        try:
            with self.ssh:
                for code, out in self.ssh.exec_command_with_stream(self.command, self.env):
                    self.send(out)
            human_time = human_seconds_time(time.time() - flag)
            self.send(f'\r\n\x1b[36m** 执行结束，总耗时：{human_time} **\x1b[0m')
        except socket.timeout:
            code = 130
            self.send('\r\n\x1b[31m### Time out\x1b[0m')
        except Exception as e:
            code = 131
            self.send(f'\r\n\x1b[31m### Exception {e}\x1b[0m')
            raise e
        finally:
            self.send_status(code)
