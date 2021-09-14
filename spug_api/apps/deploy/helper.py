# Copyright: (c) OpenSpug Organization. https://github.com/openspug/spug
# Copyright: (c) <spug.dev@gmail.com>
# Released under the AGPL-3.0 License.
from django_redis import get_redis_connection
from django.conf import settings
from libs.utils import human_datetime
from apps.host.models import Host
from apps.notify.models import Notify
import requests
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

    @classmethod
    def _make_dd_notify(cls, action, req, version, host_str):
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
        return {
            'msgtype': 'markdown',
            'markdown': {
                'title': 'Spug 发布消息通知',
                'text': '\n\n'.join(texts)
            }
        }

    @classmethod
    def _make_wx_notify(cls, action, req, version, host_str):
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
        return {
            'msgtype': 'markdown',
            'markdown': {
                'content': '\n'.join(texts)
            }
        }

    @classmethod
    def send_deploy_notify(cls, req, action=None):
        rst_notify = json.loads(req.deploy.rst_notify)
        host_ids = json.loads(req.host_ids)
        if rst_notify['mode'] != '0' and rst_notify.get('value'):
            version = req.version
            hosts = [{'id': x.id, 'name': x.name} for x in Host.objects.filter(id__in=host_ids)]
            host_str = ', '.join(x['name'] for x in hosts[:2])
            if len(hosts) > 2:
                host_str += f'等{len(hosts)}台主机'
            if rst_notify['mode'] == '1':
                data = cls._make_dd_notify(action, req, version, host_str)
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
            elif rst_notify['mode'] == '3':
                data = cls._make_wx_notify(action, req, version, host_str)
            else:
                raise NotImplementedError
            res = requests.post(rst_notify['value'], json=data)
            if res.status_code != 200:
                Notify.make_notify('flag', '1', '发布通知发送失败', f'返回状态码：{res.status_code}, 请求URL：{res.url}')
            if rst_notify['mode'] in ['1', '3']:
                res = res.json()
                if res.get('errcode') != 0:
                    Notify.make_notify('flag', '1', '发布通知发送失败', f'返回数据：{res}')

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
