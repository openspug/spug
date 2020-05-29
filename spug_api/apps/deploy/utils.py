# Copyright: (c) OpenSpug Organization. https://github.com/openspug/spug
# Copyright: (c) <spug.dev@gmail.com>
# Released under the MIT License.
from django_redis import get_redis_connection
from django.conf import settings
from libs.utils import AttrDict, human_time, human_datetime
from apps.host.models import Host
from concurrent import futures
import requests
import socket
import subprocess
import json
import uuid
import os

REPOS_DIR = settings.REPOS_DIR


def deploy_dispatch(request, req, token):
    rds = get_redis_connection()
    try:
        api_token = uuid.uuid4().hex
        rds.setex(api_token, 60 * 60, f'{req.deploy.app_id},{req.deploy.env_id}')
        helper = Helper(rds, token, req.id)
        helper.send_step('local', 1, f'完成\r\n{human_time()} 发布准备...        ')
        env = AttrDict(
            SPUG_APP_NAME=req.deploy.app.name,
            SPUG_APP_ID=str(req.deploy.app_id),
            SPUG_REQUEST_NAME=req.name,
            SPUG_DEPLOY_ID=str(req.deploy.id),
            SPUG_REQUEST_ID=str(req.id),
            SPUG_ENV_ID=str(req.deploy.env_id),
            SPUG_ENV_KEY=req.deploy.env.key,
            SPUG_VERSION=req.version,
            SPUG_DEPLOY_TYPE=req.type,
            SPUG_API_TOKEN=api_token,
        )
        if req.deploy.extend == '1':
            env.update(json.loads(req.deploy.extend_obj.custom_envs))
            _ext1_deploy(req, helper, env)
        else:
            _ext2_deploy(req, helper, env)
        req.status = '3'
    except Exception as e:
        req.status = '-3'
        raise e
    finally:
        rds.expire(token, 5 * 60)
        rds.close()
        req.save()
        Helper.send_deploy_notify(req)


def _ext1_deploy(req, helper, env):
    extend = req.deploy.extend_obj
    extras = json.loads(req.extra)
    if extras[0] == 'branch':
        tree_ish = extras[2]
        env.update(SPUG_BRANCH=extras[1], SPUG_COMMIT_ID=extras[2])
    else:
        tree_ish = extras[1]
        env.update(SPUG_TAG=extras[1])
    if req.type == '2':
        helper.send_step('local', 6, f'完成\r\n{human_time()} 回滚发布...        跳过')
    else:
        helper.local(f'cd {REPOS_DIR} && rm -rf {req.deploy_id}_*')
        helper.send_step('local', 1, '完成\r\n')

        if extend.hook_pre_server:
            helper.send_step('local', 2, f'{human_time()} 检出前任务...\r\n')
            helper.local(f'cd /tmp && {extend.hook_pre_server}', env)

        helper.send_step('local', 3, f'{human_time()} 执行检出...        ')
        git_dir = os.path.join(REPOS_DIR, str(req.deploy.id))
        command = f'cd {git_dir} && git archive --prefix={env.SPUG_VERSION}/ {tree_ish} | (cd .. && tar xf -)'
        helper.local(command)
        helper.send_step('local', 3, '完成\r\n')

        if extend.hook_post_server:
            helper.send_step('local', 4, f'{human_time()} 检出后任务...\r\n')
            helper.local(f'cd {os.path.join(REPOS_DIR, env.SPUG_VERSION)} && {extend.hook_post_server}', env)

        helper.send_step('local', 5, f'\r\n{human_time()} 执行打包...        ')
        filter_rule, exclude, contain = json.loads(extend.filter_rule), '', env.SPUG_VERSION
        files = helper.parse_filter_rule(filter_rule['data'])
        if files:
            if filter_rule['type'] == 'exclude':
                exclude = ' '.join(f'--exclude={x}' for x in files)
            else:
                contain = ' '.join(f'{env.SPUG_VERSION}/{x}' for x in files)
        helper.local(f'cd {REPOS_DIR} && tar zcf {env.SPUG_VERSION}.tar.gz {exclude} {contain}')
        helper.send_step('local', 6, f'完成')
    with futures.ThreadPoolExecutor(max_workers=min(10, os.cpu_count() + 5)) as executor:
        threads = []
        for h_id in json.loads(req.host_ids):
            env = AttrDict(env.items())
            threads.append(executor.submit(_deploy_ext1_host, helper, h_id, extend, env))
        for t in futures.as_completed(threads):
            exception = t.exception()
            if exception:
                helper.send_error(h_id, f'Exception: {exception}')
                raise exception


def _ext2_deploy(req, helper, env):
    extend = req.deploy.extend_obj
    extras = json.loads(req.extra)
    host_actions = json.loads(extend.host_actions)
    server_actions = json.loads(extend.server_actions)
    if extras and extras[0]:
        env.update({'SPUG_RELEASE': extras[0]})
    step = 2
    for action in server_actions:
        helper.send_step('local', step, f'\r\n{human_time()} {action["title"]}...\r\n')
        helper.local(f'cd /tmp && {action["data"]}', env)
        step += 1
    helper.send_step('local', 100, '完成\r\n' if step == 2 else '\r\n')
    if host_actions:
        with futures.ThreadPoolExecutor(max_workers=min(10, os.cpu_count() + 5)) as executor:
            threads = []
            for h_id in json.loads(req.host_ids):
                threads.append(executor.submit(_deploy_ext2_host, helper, h_id, host_actions, env))
            for t in futures.as_completed(threads):
                exception = t.exception()
                if exception:
                    helper.send_error(h_id, f'Exception: {exception}')
                    raise exception
    else:
        helper.send_step('local', 100, f'\r\n{human_time()} ** 发布成功 **')


def _deploy_ext1_host(helper, h_id, extend, env):
    helper.send_step(h_id, 1, f'{human_time()} 数据准备...        ')
    host = Host.objects.filter(pk=h_id).first()
    if not host:
        helper.send_error(h_id, 'no such host')
    env.update({'SPUG_HOST_ID': h_id, 'SPUG_HOST_NAME': host.hostname})
    ssh = host.get_ssh()
    if env.SPUG_DEPLOY_TYPE != '2':
        code, _ = ssh.exec_command(f'mkdir -p {extend.dst_repo} && [ -e {extend.dst_dir} ] && [ ! -L {extend.dst_dir} ]')
        if code == 0:
            helper.send_error(host.id, f'please make sure the {extend.dst_dir!r} is not exists.')
        # clean
        clean_command = f'ls -rd {extend.deploy_id}_* 2> /dev/null | tail -n +{extend.versions + 1} | xargs rm -rf'
        helper.remote(host.id, ssh, f'cd {extend.dst_repo} && rm -rf {env.SPUG_VERSION} && {clean_command}')
        # transfer files
        tar_gz_file = f'{env.SPUG_VERSION}.tar.gz'
        try:
            ssh.put_file(os.path.join(REPOS_DIR, tar_gz_file), os.path.join(extend.dst_repo, tar_gz_file))
        except Exception as e:
            helper.send_error(host.id, f'exception: {e}')

        command = f'cd {extend.dst_repo} && tar xf {tar_gz_file} && rm -f {env.SPUG_APP_ID}_*.tar.gz'
        helper.remote(host.id, ssh, command)
    helper.send_step(h_id, 1, '完成\r\n')

    # pre host
    repo_dir = os.path.join(extend.dst_repo, env.SPUG_VERSION)
    if extend.hook_pre_host:
        helper.send_step(h_id, 2, f'{human_time()} 发布前任务...       \r\n')
        command = f'cd {repo_dir} && {extend.hook_pre_host}'
        helper.remote(host.id, ssh, command, env)

    # do deploy
    helper.send_step(h_id, 3, f'{human_time()} 执行发布...        ')
    helper.remote(host.id, ssh, f'rm -f {extend.dst_dir} && ln -sfn {repo_dir} {extend.dst_dir}')
    helper.send_step(h_id, 3, '完成\r\n')

    # post host
    if extend.hook_post_host:
        helper.send_step(h_id, 4, f'{human_time()} 发布后任务...       \r\n')
        command = f'cd {extend.dst_dir} && {extend.hook_post_host}'
        helper.remote(host.id, ssh, command, env)

    helper.send_step(h_id, 5, f'\r\n{human_time()} ** 发布成功 **')


def _deploy_ext2_host(helper, h_id, actions, env):
    helper.send_step(h_id, 1, f'{human_time()} 数据准备...        ')
    host = Host.objects.filter(pk=h_id).first()
    if not host:
        helper.send_error(h_id, 'no such host')
    env.update({'SPUG_HOST_ID': h_id, 'SPUG_HOST_NAME': host.hostname})
    ssh = host.get_ssh()
    helper.send_step(h_id, 2, '完成\r\n')
    for index, action in enumerate(actions):
        helper.send_step(h_id, 2 + index, f'{human_time()} {action["title"]}...\r\n')
        helper.remote(host.id, ssh, f'cd /tmp && {action["data"]}', env)

    helper.send_step(h_id, 100, f'\r\n{human_time()} ** 发布成功 **')


class Helper:
    def __init__(self, rds, token, r_id):
        self.rds = rds
        self.token = token
        self.log_key = f'{settings.REQUEST_KEY}:{r_id}'
        self.rds.delete(self.log_key)

    @staticmethod
    def send_deploy_notify(req):
        rst_notify = json.loads(req.deploy.rst_notify)
        host_ids = json.loads(req.host_ids)
        if rst_notify['mode'] != '0' and rst_notify.get('value'):
            extra = json.loads(req.extra)
            if req.deploy.extend == '1':
                mode, extra1, extra2 = extra
                if mode == 'branch':
                    version = f'{extra1}#{extra2[:6]}'
                else:
                    version = extra1
            else:
                version = extra[0]
            hosts = [{'id': x.id, 'name': x.name} for x in Host.objects.filter(id__in=host_ids)]
            if rst_notify['mode'] == '1':
                color, text = ('#8ece60', '成功') if req.status == '3' else ('#f90202', '失败')
                texts = [
                    '## %s ## ' % '发布结果通知',
                    f'**应用名称：** {req.deploy.app.name} ',
                    f'**应用版本：** {version} ',
                    f'**发布环境：** {req.deploy.env.name} ',
                    f'**发布主机：** {",".join(x["name"] for x in hosts)} ',
                    f'**发布结果：** <font color="{color}">{text}</font>',
                    f'**发布时间：** {human_datetime()} ',
                    '> 来自 Spug运维平台'
                ]
                data = {
                    'msgtype': 'markdown',
                    'markdown': {
                        'title': '发布结果通知',
                        'text': '\n\n'.join(texts)
                    }
                }
                requests.post(rst_notify['value'], json=data)
            elif rst_notify['mode'] == '2':
                data = {
                    'req_id': req.id,
                    'app_id': req.deploy.app_id,
                    'app_name': req.deploy.app.name,
                    'env_id': req.deploy.env_id,
                    'env_name': req.deploy.env.name,
                    'version': version,
                    'targets': hosts,
                    'is_success': req.status == '3',
                    'deploy_at': human_datetime()
                }
                requests.post(rst_notify['value'], json=data)
            elif rst_notify['mode'] == '3':
                color, text = ('info', '成功') if req.status == '3' else ('warning', '失败')
                texts = [
                    '## %s' % '发布结果通知',
                    f'**应用名称：** {req.deploy.app.name} ',
                    f'**应用版本：** {version} ',
                    f'**发布环境：** {req.deploy.env.name} ',
                    f'**发布主机：** {",".join(x["name"] for x in hosts)} ',
                    f'**发布结果：** <font color="{color}">{text}</font>',
                    f'**发布时间：** {human_datetime()} ',
                    '> 来自 Spug运维平台'
                ]
                data = {
                    'msgtype': 'markdown',
                    'markdown': {
                        'content': '\n'.join(texts)
                    }
                }
                requests.post(rst_notify['value'], json=data)

    def parse_filter_rule(self, data: str):
        data, files = data.strip(), []
        if data:
            for line in data.split('\n'):
                line = line.strip()
                if line and not line.startswith('#'):
                    files.append(line)
        return files

    def _send(self, message):
        self.rds.lpush(self.token, json.dumps(message))
        self.rds.lpush(self.log_key, json.dumps(message))

    def send_info(self, key, message):
        self._send({'key': key, 'status': 'info', 'data': message})

    def send_error(self, key, message):
        message = '\r\n' + message
        self._send({'key': key, 'status': 'error', 'data': message})
        raise Exception(message)

    def send_step(self, key, step, data):
        self._send({'key': key, 'step': step, 'data': data})

    def local(self, command, env=None):
        command = 'set -e\n' + command
        task = subprocess.Popen(command, env=env, shell=True, stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
        while True:
            message = task.stdout.readline()
            if not message:
                break
            self.send_info('local', message.decode())
        if task.wait() != 0:
            self.send_error('local', f'exit code: {task.returncode}')

    def remote(self, key, ssh, command, env=None):
        code = -1
        try:
            for code, out in ssh.exec_command_with_stream(command, environment=env):
                self.send_info(key, out)
            if code != 0:
                self.send_error(key, f'exit code: {code}')
        except socket.timeout:
            self.send_error(key, 'time out')
