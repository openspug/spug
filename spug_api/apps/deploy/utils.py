# Copyright: (c) OpenSpug Organization. https://github.com/openspug/spug
# Copyright: (c) <spug.dev@gmail.com>
# Released under the AGPL-3.0 License.
from django_redis import get_redis_connection
from django.conf import settings
from libs.utils import AttrDict, human_time, human_datetime, parse_time
from apps.host.models import Host
from apps.notify.models import Notify
from apps.deploy.models import DeployRequest
from concurrent import futures
from datetime import datetime
import requests
import subprocess
import json
import uuid
import os

REPOS_DIR = settings.REPOS_DIR


class SpugError(Exception):
    pass


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
            SPUG_REPOS_DIR=REPOS_DIR,
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
    env.update(SPUG_DST_DIR=extend.dst_dir)
    if extras[0] == 'branch':
        tree_ish = extras[2]
        env.update(SPUG_GIT_BRANCH=extras[1], SPUG_GIT_COMMIT_ID=extras[2])
    else:
        tree_ish = extras[1]
        env.update(SPUG_GIT_TAG=extras[1])
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
                excludes = []
                for x in files:
                    if x.startswith('/'):
                        excludes.append(f'--exclude={env.SPUG_VERSION}{x}')
                    else:
                        excludes.append(f'--exclude={x}')
                exclude = ' '.join(excludes)
            else:
                contain = ' '.join(f'{env.SPUG_VERSION}/{x}' for x in files)
        helper.local(f'cd {REPOS_DIR} && tar zcf {env.SPUG_VERSION}.tar.gz {exclude} {contain}')
        helper.send_step('local', 6, f'完成')
    threads, latest_exception = [], None
    with futures.ThreadPoolExecutor(max_workers=min(10, os.cpu_count() + 5)) as executor:
        for h_id in json.loads(req.host_ids):
            env = AttrDict(env.items())
            t = executor.submit(_deploy_ext1_host, helper, h_id, extend, env)
            t.h_id = h_id
            threads.append(t)
        for t in futures.as_completed(threads):
            exception = t.exception()
            if exception:
                latest_exception = exception
                if not isinstance(exception, SpugError):
                    helper.send_error(t.h_id, f'Exception: {exception}', False)
    if latest_exception:
        raise latest_exception


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

    tmp_transfer_file = None
    for action in host_actions:
        if action.get('type') == 'transfer':
            if action.get('src_mode') == '1':
                break
            helper.send_info('local', f'{human_time()} 检测到来源为本地路径的数据传输动作，执行打包...   ')
            action['src'] = action['src'].rstrip('/ ')
            action['dst'] = action['dst'].rstrip('/ ')
            if not action['src'] or not action['dst']:
                helper.send_error('local', f'invalid path for transfer, src: {action["src"]} dst: {action["dst"]}')
            is_dir, exclude = os.path.isdir(action['src']), ''
            sp_dir, sd_dst = os.path.split(action['src'])
            contain = sd_dst
            if action['mode'] != '0' and is_dir:
                files = helper.parse_filter_rule(action['rule'], ',')
                if files:
                    if action['mode'] == '1':
                        contain = ' '.join(f'{sd_dst}/{x}' for x in files)
                    else:
                        excludes = []
                        for x in files:
                            if x.startswith('/'):
                                excludes.append(f'--exclude={sd_dst}{x}')
                            else:
                                excludes.append(f'--exclude={x}')
                        exclude = ' '.join(excludes)
            tar_gz_file = f'{env.SPUG_VERSION}.tar.gz'
            helper.local(f'cd {sp_dir} && tar zcf {tar_gz_file} {exclude} {contain}')
            helper.send_info('local', '完成\r\n')
            tmp_transfer_file = os.path.join(sp_dir, tar_gz_file)
            break
    if host_actions:
        threads, latest_exception = [], None
        with futures.ThreadPoolExecutor(max_workers=min(10, os.cpu_count() + 5)) as executor:
            for h_id in json.loads(req.host_ids):
                env = AttrDict(env.items())
                t = executor.submit(_deploy_ext2_host, helper, h_id, host_actions, env)
                t.h_id = h_id
                threads.append(t)
            for t in futures.as_completed(threads):
                exception = t.exception()
                if exception:
                    latest_exception = exception
                    if not isinstance(exception, SpugError):
                        helper.send_error(t.h_id, f'Exception: {exception}', False)
            if tmp_transfer_file:
                os.remove(tmp_transfer_file)
        if latest_exception:
            raise latest_exception
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
        code, _ = ssh.exec_command(
            f'mkdir -p {extend.dst_repo} && [ -e {extend.dst_dir} ] && [ ! -L {extend.dst_dir} ]')
        if code == 0:
            helper.send_error(host.id, f'检测到该主机的发布目录 {extend.dst_dir!r} 已存在，为了数据安全请自行备份后删除该目录，Spug 将会创建并接管该目录。')
        # clean
        clean_command = f'ls -d {extend.deploy_id}_* 2> /dev/null | sort -t _ -rnk2 | tail -n +{extend.versions + 1} | xargs rm -rf'
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
        command = f'cd {repo_dir} ; {extend.hook_pre_host}'
        helper.remote(host.id, ssh, command, env)

    # do deploy
    helper.send_step(h_id, 3, f'{human_time()} 执行发布...        ')
    helper.remote(host.id, ssh, f'rm -f {extend.dst_dir} && ln -sfn {repo_dir} {extend.dst_dir}')
    helper.send_step(h_id, 3, '完成\r\n')

    # post host
    if extend.hook_post_host:
        helper.send_step(h_id, 4, f'{human_time()} 发布后任务...       \r\n')
        command = f'cd {extend.dst_dir} ; {extend.hook_post_host}'
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
        if action.get('type') == 'transfer':
            if action.get('src_mode') == '1':
                try:
                    ssh.put_file(os.path.join(REPOS_DIR, env.SPUG_DEPLOY_ID, env.SPUG_VERSION), action['dst'])
                except Exception as e:
                    helper.send_error(host.id, f'exception: {e}')
                helper.send_info(host.id, 'transfer completed\r\n')
                continue
            else:
                sp_dir, sd_dst = os.path.split(action['src'])
                tar_gz_file = f'{env.SPUG_VERSION}.tar.gz'
                try:
                    ssh.put_file(os.path.join(sp_dir, tar_gz_file), f'/tmp/{tar_gz_file}')
                except Exception as e:
                    helper.send_error(host.id, f'exception: {e}')

                command = f'cd /tmp && tar xf {tar_gz_file} && rm -f {tar_gz_file} '
                command += f'&& rm -rf {action["dst"]} && mv /tmp/{sd_dst} {action["dst"]} && echo "transfer completed"'
        else:
            command = f'cd /tmp ; {action["data"]}'
        helper.remote(host.id, ssh, command, env)

    helper.send_step(h_id, 100, f'\r\n{human_time()} ** 发布成功 **')


class Helper:
    def __init__(self, rds, token, r_id):
        self.rds = rds
        self.token = token
        self.log_key = f'{settings.REQUEST_KEY}:{r_id}'
        self.rds.delete(self.log_key)

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
            texts.extend([
                f'**执行人员：** {req.do_by.nickname}',
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
            texts.extend([
                f'执行人员： {req.do_by.nickname}',
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
            extra = json.loads(req.extra)
            if req.deploy.extend == '1':
                mode, extra1, extra2 = extra
                if mode == 'branch':
                    version = f'{extra1}#{extra2[:6]}'
                else:
                    version = extra1
            else:
                version = extra[0] or ''
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
        self.rds.lpush(self.token, json.dumps(message))
        self.rds.lpush(self.log_key, json.dumps(message))

    def send_info(self, key, message):
        self._send({'key': key, 'status': 'info', 'data': message})

    def send_error(self, key, message, with_break=True):
        message = '\r\n' + message
        self._send({'key': key, 'status': 'error', 'data': message})
        if with_break:
            raise SpugError

    def send_step(self, key, step, data):
        self._send({'key': key, 'step': step, 'data': data})

    def local(self, command, env=None):
        if env:
            env = dict(env.items())
            env.update(os.environ)
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
        for code, out in ssh.exec_command_with_stream(command, environment=env):
            self.send_info(key, out)
        if code != 0:
            self.send_error(key, f'exit code: {code}')


def auto_update_status():
    now = datetime.now()
    for req in DeployRequest.objects.filter(status='2'):
        if (now - parse_time(req.do_at)).seconds > 3600:
            req.status = '-3'
            req.save()
