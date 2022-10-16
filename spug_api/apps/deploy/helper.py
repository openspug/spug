# Copyright: (c) OpenSpug Organization. https://github.com/openspug/spug
# Copyright: (c) <spug.dev@gmail.com>
# Released under the AGPL-3.0 License.
from django.conf import settings
from django.template.defaultfilters import filesizeformat
from django_redis import get_redis_connection
from libs.utils import human_datetime, render_str, str_decode
from libs.spug import Notification
from apps.host.models import Host
from functools import partial
from collections import defaultdict
import subprocess
import json
import os
import re


class SpugError(Exception):
    pass


class NotifyMixin:
    @classmethod
    def _make_dd_notify(cls, url, action, req, version, host_str):
        texts = [
            f'**申请标题：** {req.name}',
            f'**应用名称：** {req.deploy.app.name}',
            f'**应用版本：** {version}',
            f'**发布环境：** {req.deploy.env.name}',
            f'**发布主机：** {host_str}',
        ]
        if action == 'approve_req':
            texts.insert(0, '## %s ## ' % '发布审核申请')
            texts.extend([
                f'**申请人员：** {req.created_by.nickname}',
                f'**申请时间：** {human_datetime()}',
                '> 来自 Spug运维平台'
            ])
        elif action == 'approve_rst':
            color, text = ('#008000', '通过') if req.status == '1' else ('#f90202', '驳回')
            texts.insert(0, '## %s ## ' % '发布审核结果')
            texts.extend([
                f'**审核人员：** {req.approve_by.nickname}',
                f'**审核结果：** <font color="{color}">{text}</font>',
                f'**审核意见：** {req.reason or ""}',
                f'**审核时间：** {human_datetime()}',
                '> 来自 Spug运维平台'
            ])
        else:
            color, text = ('#008000', '成功') if req.status == '3' else ('#f90202', '失败')
            texts.insert(0, '## %s ## ' % '发布结果通知')
            if req.approve_at:
                texts.append(f'**审核人员：** {req.approve_by.nickname}')
            do_user = req.do_by.nickname if req.type != '3' else 'Webhook'
            texts.extend([
                f'**执行人员：** {do_user}',
                f'**发布结果：** <font color="{color}">{text}</font>',
                f'**发布时间：** {human_datetime()}',
                '> 来自 Spug运维平台'
            ])
        data = {
            'msgtype': 'markdown',
            'markdown': {
                'title': 'Spug 发布消息通知',
                'text': '\n\n'.join(texts)
            },
            'at': {
                'isAtAll': True
            }
        }
        Notification.handle_request(url, data, 'dd')

    @classmethod
    def _make_wx_notify(cls, url, action, req, version, host_str):
        texts = [
            f'申请标题： {req.name}',
            f'应用名称： {req.deploy.app.name}',
            f'应用版本： {version}',
            f'发布环境： {req.deploy.env.name}',
            f'发布主机： {host_str}',
        ]

        if action == 'approve_req':
            texts.insert(0, '## %s' % '发布审核申请')
            texts.extend([
                f'申请人员： {req.created_by.nickname}',
                f'申请时间： {human_datetime()}',
                '> 来自 Spug运维平台'
            ])
        elif action == 'approve_rst':
            color, text = ('info', '通过') if req.status == '1' else ('warning', '驳回')
            texts.insert(0, '## %s' % '发布审核结果')
            texts.extend([
                f'审核人员： {req.approve_by.nickname}',
                f'审核结果： <font color="{color}">{text}</font>',
                f'审核意见： {req.reason or ""}',
                f'审核时间： {human_datetime()}',
                '> 来自 Spug运维平台'
            ])
        else:
            color, text = ('info', '成功') if req.status == '3' else ('warning', '失败')
            texts.insert(0, '## %s' % '发布结果通知')
            if req.approve_at:
                texts.append(f'审核人员： {req.approve_by.nickname}')
            do_user = req.do_by.nickname if req.type != '3' else 'Webhook'
            texts.extend([
                f'执行人员： {do_user}',
                f'发布结果： <font color="{color}">{text}</font>',
                f'发布时间： {human_datetime()}',
                '> 来自 Spug运维平台'
            ])
        data = {
            'msgtype': 'markdown',
            'markdown': {
                'content': '\n'.join(texts)
            }
        }
        Notification.handle_request(url, data, 'wx')

    @classmethod
    def _make_fs_notify(cls, url, action, req, version, host_str):
        texts = [
            f'申请标题： {req.name}',
            f'应用名称： {req.deploy.app.name}',
            f'应用版本： {version}',
            f'发布环境： {req.deploy.env.name}',
            f'发布主机： {host_str}',
        ]

        if action == 'approve_req':
            title = '发布审核申请'
            texts.extend([
                f'申请人员： {req.created_by.nickname}',
                f'申请时间： {human_datetime()}',
            ])
        elif action == 'approve_rst':
            title = '发布审核结果'
            text = '通过' if req.status == '1' else '驳回'
            texts.extend([
                f'审核人员： {req.approve_by.nickname}',
                f'审核结果： {text}',
                f'审核意见： {req.reason or ""}',
                f'审核时间： {human_datetime()}',
            ])
        else:
            title = '发布结果通知'
            text = '成功 ✅' if req.status == '3' else '失败 ❗'
            if req.approve_at:
                texts.append(f'审核人员： {req.approve_by.nickname}')
            do_user = req.do_by.nickname if req.type != '3' else 'Webhook'
            texts.extend([
                f'执行人员： {do_user}',
                f'发布结果： {text}',
                f'发布时间： {human_datetime()}',
            ])
        data = {
            'msg_type': 'post',
            'content': {
                'post': {
                    'zh_cn': {
                        'title': title,
                        'content': [[{'tag': 'text', 'text': x}] for x in texts] + [[{'tag': 'at', 'user_id': 'all'}]]
                    }
                }
            }
        }
        Notification.handle_request(url, data, 'fs')

    @classmethod
    def send_deploy_notify(cls, req, action=None):
        rst_notify = json.loads(req.deploy.rst_notify)
        host_ids = json.loads(req.host_ids) if isinstance(req.host_ids, str) else req.host_ids
        if rst_notify['mode'] != '0' and rst_notify.get('value'):
            url = rst_notify['value']
            version = req.version
            hosts = [{'id': x.id, 'name': x.name} for x in Host.objects.filter(id__in=host_ids)]
            host_str = ', '.join(x['name'] for x in hosts[:2])
            if len(hosts) > 2:
                host_str += f'等{len(hosts)}台主机'
            if rst_notify['mode'] == '1':
                cls._make_dd_notify(url, action, req, version, host_str)
            elif rst_notify['mode'] == '2':
                data = {
                    'action': action,
                    'req_id': req.id,
                    'req_name': req.name,
                    'app_id': req.deploy.app_id,
                    'app_name': req.deploy.app.name,
                    'env_id': req.deploy.env_id,
                    'env_name': req.deploy.env.name,
                    'status': req.status,
                    'reason': req.reason,
                    'version': version,
                    'targets': hosts,
                    'is_success': req.status == '3',
                    'created_at': human_datetime()
                }
                Notification.handle_request(url, data)
            elif rst_notify['mode'] == '3':
                cls._make_wx_notify(url, action, req, version, host_str)
            elif rst_notify['mode'] == '4':
                cls._make_fs_notify(url, action, req, version, host_str)
            else:
                raise NotImplementedError


class KitMixin:
    regex = re.compile(r'^((\r\n)*)(.*?)((\r\n)*)$', re.DOTALL)

    @classmethod
    def term_message(cls, message, color_mode='info', with_time=False):
        prefix = f'{human_datetime()} ' if with_time else ''
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


class Helper(NotifyMixin, KitMixin):
    def __init__(self, rds, rds_key):
        self.rds = rds
        self.rds_key = rds_key
        self.callback = []
        self.buffers = defaultdict(str)
        self.flags = defaultdict(bool)
        self.files = {}
        self.already_clear = False

    def __del__(self):
        self.clear()

    @classmethod
    def make(cls, rds, rds_key, keys):
        rds.delete(rds_key)
        instance = cls(rds, rds_key)
        for key in keys:
            instance.get_file(key)
        return instance

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

    def add_callback(self, func):
        self.callback.append(func)

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

    def _send(self, key, data, *, status=''):
        message = {'key': key, 'data': data}
        if status:
            message['status'] = status
        self.rds.rpush(self.rds_key, json.dumps(message))

        for idx, line in enumerate(data.split('\r\n')):
            if idx != 0:
                tmp = [status, self.buffers[key] + '\r\n']
                file = self.get_file(key)
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
        self._send(key, '\033[2J\033[3J\033[1;1H')

    def send_info(self, key, message, status='', with_time=True):
        message = self.term_message(message, 'info', with_time)
        self._send(key, message, status=status)

    def send_warn(self, key, message, status=''):
        message = self.term_message(message, 'warn')
        self._send(key, message, status=status)

    def send_success(self, key, message, status=''):
        message = self.term_message(message, 'success')
        self._send(key, message, status=status)

    def send_error(self, key, message, with_break=True):
        message = self.term_message(message, 'error')
        if not message.endswith('\r\n'):
            message += '\r\n'
        self._send(key, message, status='error')
        if with_break:
            raise SpugError

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
        while self.callback:
            self.callback.pop()()

    def progress_callback(self, key):
        def func(k, n, t):
            message = f'\r         {filesizeformat(n):<8}/{filesizeformat(t):>8}  '
            self._send(k, message)

        self._send(key, '\r\n')
        return partial(func, key)

    def local(self, command, env=None):
        if env:
            env = dict(env.items())
            env.update(os.environ)
        task = subprocess.Popen(
            command,
            env=env,
            shell=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            preexec_fn=os.setsid)
        self.save_pid(task.pid, 'local')
        message = b''
        while True:
            output = task.stdout.read(1)
            if not output:
                break
            if output in (b'\r', b'\n'):
                message += b'\r\n' if output == b'\n' else b'\r'
                message = str_decode(message)
                self._send('local', message)
                message = b''
            else:
                message += output
        if task.wait() != 0:
            self.send_error('local', f'exit code: {task.returncode}')

    def remote(self, key, ssh, command, env=None):
        code = -1
        for code, out in ssh.exec_command_with_stream(command, environment=env):
            self._send(key, out)
        if code != 0:
            self.send_error(key, f'exit code: {code}')

    def remote_raw(self, key, ssh, command):
        code, out = ssh.exec_command_raw(command)
        if code != 0:
            self.send_error(key, f'exit code: {code}, {out}')
