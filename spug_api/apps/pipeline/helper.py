# Copyright: (c) OpenSpug Organization. https://github.com/openspug/spug
# Copyright: (c) <spug.dev@gmail.com>
# Released under the AGPL-3.0 License.
from django.conf import settings
from django.template.defaultfilters import filesizeformat
from django_redis import get_redis_connection
from libs.utils import SpugError, human_time, render_str, human_seconds_time
from apps.config.utils import update_config_by_var
from collections import defaultdict
import time
import json
import os
import re


class KitMixin:
    regex = re.compile(r'^((\r\n)*)(.*?)((\r\n)*)$', re.DOTALL)

    @classmethod
    def term_message(cls, message, color_mode='info', with_time=False):
        prefix = f'{human_time()} ' if with_time else ''
        if color_mode == 'info':
            mode = '36m'
        elif color_mode == 'warn':
            mode = '33m'
        elif color_mode == 'error':
            mode = '31m'
        elif color_mode == 'success':
            mode = '32m'
        else:
            raise TypeError

        return cls.regex.sub(fr'\1\033[{mode}{prefix}\3\033[0m\4', message)


class Helper(KitMixin):
    def __init__(self, rds, rds_key):
        self.rds = rds
        self.rds_key = rds_key
        self.buffers = defaultdict(str)
        self.flags = defaultdict(bool)
        self.already_clear = False
        self.files = {}

    def __del__(self):
        self.clear()

    @classmethod
    def make(cls, rds, rds_key):
        rds.delete(rds_key)
        return cls(rds, rds_key)

    @classmethod
    def fill_outputs(cls, outputs, deploy_key):
        rds = get_redis_connection()
        key_ttl = rds.ttl(deploy_key)
        counter, hit_keys = 0, set()
        if key_ttl > 30 or key_ttl == -1:
            data = rds.lrange(deploy_key, counter, counter + 9)
            while data:
                for item in data:
                    counter += 1
                    item = json.loads(item.decode())
                    key = item['key']
                    if key in outputs:
                        hit_keys.add(key)
                        if 'data' in item:
                            outputs[key]['data'] += item['data']
                        if 'status' in item:
                            outputs[key]['status'] = item['status']
                data = rds.lrange(deploy_key, counter, counter + 9)

        for key in outputs.keys():
            if key in hit_keys:
                continue
            file_name = os.path.join(settings.DEPLOY_DIR, f'{deploy_key}:{key}')
            if not os.path.exists(file_name):
                continue
            with open(file_name, newline='\r\n') as f:
                line = f.readline()
                while line:
                    status, data = line.split(',', 1)
                    if data:
                        outputs[key]['data'] += data
                    if status:
                        outputs[key]['status'] = status
                    line = f.readline()
        return counter

    def get_file(self, key):
        if key in self.files:
            return self.files[key]
        file = open(os.path.join(settings.DEPLOY_DIR, f'{self.rds_key}:{key}'), 'w')
        self.files[key] = file
        return file

    def get_cross_env(self, key):
        file = os.path.join(settings.DEPLOY_DIR, key)
        if os.path.exists(file):
            with open(file, 'r') as f:
                return json.loads(f.read())
        return {}

    def set_cross_env(self, key, envs):
        file_envs = {}
        for k, v in envs.items():
            if k == 'SPUG_SET':
                try:
                    update_config_by_var(v)
                except SpugError as e:
                    self.send_error(key, f'{e}')
            elif k.startswith('SPUG_GEV_'):
                file_envs[k] = v

        file = os.path.join(settings.DEPLOY_DIR, key)
        with open(file, 'w') as f:
            f.write(json.dumps(file_envs))

    def save_pid(self, pid, key):
        self.rds.set(f'PID:{self.rds_key}:{key}', pid, 3600)

    def parse_filter_rule(self, data: str, sep='\n', env=None):
        data, files = data.strip(), []
        if data:
            for line in data.split(sep):
                line = line.strip()
                if line and not line.startswith('#'):
                    files.append(render_str(line, env))
        return files

    def send(self, key, data, *, status=''):
        message = {'key': key, 'data': data}
        if status:
            message['status'] = status
        print(self.rds_key, message)
        self.rds.rpush(self.rds_key, json.dumps(message))

        file = self.get_file(key)
        for idx, line in enumerate(data.split('\r\n')):
            if idx != 0:
                tmp = [status, self.buffers[key] + '\r\n']
                file.write(','.join(tmp))
                file.flush()
                self.buffers[key] = ''
                self.flags[key] = False
            if line:
                for idx2, item in enumerate(line.split('\r')):
                    if idx2 != 0:
                        self.flags[key] = True
                    if item:
                        if self.flags[key]:
                            self.buffers[key] = item
                            self.flags[key] = False
                        else:
                            self.buffers[key] += item

    def send_clear(self, key):
        self.send(key, '\033[2J\033[3J\033[1;1H')

    def send_info(self, key, message, status='', with_time=True):
        message = self.term_message(message, 'info', with_time)
        self.send(key, message, status=status)

    def send_warn(self, key, message, status=''):
        message = self.term_message(message, 'warn')
        self.send(key, message, status=status)

    def send_success(self, key, message, with_time=True, start_time=None):
        if start_time:
            message += f', 耗时: {human_seconds_time(time.time() - start_time)}'
        message = self.term_message(f'\r\n** {message} **', 'success', with_time)
        self.send(key, message, status='success')

    def send_error(self, key, message, with_break=False):
        message = self.term_message(f'\r\n{message}', 'error')
        self.send(key, message, status='error')
        if with_break:
            raise SpugError

    def send_status(self, key, status):
        self.send(key, '', status=status)

    def clear(self):
        if self.already_clear:
            return
        self.already_clear = True
        for key, value in self.buffers.items():
            if value:
                file = self.get_file(key)
                file.write(f',{value}')
        for file in self.files.values():
            file.close()
        if self.rds.ttl(self.rds_key) == -1:
            self.rds.expire(self.rds_key, 60)

    def progress_callback(self, key):
        def func(n, t):
            message = f'\r         {filesizeformat(n):<8}/{filesizeformat(t):>8}  '
            self.send(key, message)

        self.send(key, '\r\n')
        return func

    def remote_exec(self, key, ssh, command, env=None):
        code = -1
        for code, out in ssh.exec_command_with_stream(command, environment=env):
            self.send(key, out)
        if code != 0:
            self.send_error(key, f'exit code: {code}')
        return code == 0
