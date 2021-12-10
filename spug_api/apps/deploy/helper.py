# Copyright: (c) OpenSpug Organization. https://github.com/openspug/spug
# Copyright: (c) <spug.dev@gmail.com>
# Released under the AGPL-3.0 License.
from django_redis import get_redis_connection
from django.conf import settings
from libs.utils import human_datetime
from libs.spug import Notification
from apps.host.models import Host
import subprocess
import json
import os


class SpugError(Exception):
    pass


class Helper:
    def __init__(self, rds, key):
        self.rds = rds
        self.key = key
        self.rds.delete(self.key)
        self.callback = []

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
        host_ids = json.loads(req.host_ids)
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

    def add_callback(self, func):
        self.callback.append(func)

    def parse_filter_rule(self, data: str, sep='\n'):
        data, files = data.strip(), []
        if data:
            for line in data.split(sep):
                line = line.strip()
                if line and not line.startswith('#'):
                    files.append(line)
        return files

    def _send(self, message):
        self.rds.rpush(self.key, json.dumps(message))

    def send_info(self, key, message):
        if message:
            self._send({'key': key, 'data': message})

    def send_error(self, key, message, with_break=True):
        message = f'\r\n\033[31m{message}\033[0m'
        self._send({'key': key, 'status': 'error', 'data': message})
        if with_break:
            raise SpugError

    def send_step(self, key, step, data):
        self._send({'key': key, 'step': step, 'data': data})

    def clear(self):
        # save logs for two weeks
        self.rds.expire(self.key, 14 * 24 * 60 * 60)
        self.rds.close()
        # callback
        for func in self.callback:
            func()

    def local(self, command, env=None):
        if env:
            env = dict(env.items())
            env.update(os.environ)
        task = subprocess.Popen(command, env=env, shell=True, stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
        while True:
            message = task.stdout.readline()
            if not message:
                break
            message = message.decode().rstrip('\r\n')
            self.send_info('local', message + '\r\n')
        if task.wait() != 0:
            self.send_error('local', f'exit code: {task.returncode}')

    def remote(self, key, ssh, command, env=None):
        code = -1
        for code, out in ssh.exec_command_with_stream(command, environment=env):
            self.send_info(key, out)
        if code != 0:
            self.send_error(key, f'exit code: {code}')

    def remote_raw(self, key, ssh, command):
        code, out = ssh.exec_command_raw(command)
        if code != 0:
            self.send_error(key, f'exit code: {code}, {out}')
