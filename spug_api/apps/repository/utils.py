# Copyright: (c) OpenSpug Organization. https://github.com/openspug/spug
# Copyright: (c) <spug.dev@gmail.com>
# Released under the AGPL-3.0 License.
from django_redis import get_redis_connection
from django.conf import settings
from django.db import close_old_connections
from libs.utils import AttrDict, human_time
from apps.repository.models import Repository
from apps.app.utils import fetch_repo
import subprocess
import json
import uuid
import os

REPOS_DIR = settings.REPOS_DIR


class SpugError(Exception):
    pass


def dispatch(rep: Repository):
    rds = get_redis_connection()
    rds_key = f'{settings.BUILD_KEY}:{rep.spug_version}'
    rep.status = '1'
    rep.save()
    helper = Helper(rds, rds_key)
    try:
        api_token = uuid.uuid4().hex
        rds.setex(api_token, 60 * 60, f'{rep.app_id},{rep.env_id}')
        helper.send_info('local', f'完成\r\n{human_time()} 构建准备...        ')
        env = AttrDict(
            SPUG_APP_NAME=rep.app.name,
            SPUG_APP_ID=str(rep.app_id),
            SPUG_DEPLOY_ID=str(rep.deploy_id),
            SPUG_BUILD_ID=str(rep.id),
            SPUG_ENV_ID=str(rep.env_id),
            SPUG_ENV_KEY=rep.env.key,
            SPUG_VERSION=rep.version,
            SPUG_API_TOKEN=api_token,
            SPUG_REPOS_DIR=REPOS_DIR,
        )
        _build(rep, helper, env)
        rep.status = '5'
    except Exception as e:
        rep.status = '2'
        raise e
    finally:
        helper.local(f'cd {REPOS_DIR} && rm -rf {rep.spug_version}')
        close_old_connections()
        # save the build log for two weeks
        rds.expire(rds_key, 14 * 24 * 60 * 60)
        rds.close()
        rep.save()
        return rep


def _build(rep: Repository, helper, env):
    extend = rep.deploy.extend_obj
    extras = json.loads(rep.extra)
    git_dir = os.path.join(REPOS_DIR, str(rep.deploy_id))
    build_dir = os.path.join(REPOS_DIR, rep.spug_version)
    tar_file = os.path.join(REPOS_DIR, 'build', f'{rep.spug_version}.tar.gz')
    env.update(SPUG_DST_DIR=extend.dst_dir)
    if extras[0] == 'branch':
        tree_ish = extras[2]
        env.update(SPUG_GIT_BRANCH=extras[1], SPUG_GIT_COMMIT_ID=extras[2])
    else:
        tree_ish = extras[1]
        env.update(SPUG_GIT_TAG=extras[1])
    fetch_repo(rep.deploy_id, extend.git_repo)
    helper.send_info('local', '完成\r\n')

    if extend.hook_pre_server:
        helper.send_step('local', 1, f'{human_time()} 检出前任务...\r\n')
        helper.local(f'cd {git_dir} && {extend.hook_pre_server}', env)

    helper.send_step('local', 2, f'{human_time()} 执行检出...        ')
    command = f'cd {git_dir} && git archive --prefix={rep.spug_version}/ {tree_ish} | (cd .. && tar xf -)'
    helper.local(command)
    helper.send_info('local', '完成\r\n')

    if extend.hook_post_server:
        helper.send_step('local', 3, f'{human_time()} 检出后任务...\r\n')
        helper.local(f'cd {build_dir} && {extend.hook_post_server}', env)

    helper.send_step('local', 4, f'\r\n{human_time()} 执行打包...        ')
    filter_rule, exclude, contain = json.loads(extend.filter_rule), '', rep.spug_version
    files = helper.parse_filter_rule(filter_rule['data'])
    if files:
        if filter_rule['type'] == 'exclude':
            excludes = []
            for x in files:
                if x.startswith('/'):
                    excludes.append(f'--exclude={rep.spug_version}{x}')
                else:
                    excludes.append(f'--exclude={x}')
            exclude = ' '.join(excludes)
        else:
            contain = ' '.join(f'{rep.spug_version}/{x}' for x in files)
    helper.local(f'cd {REPOS_DIR} && tar zcf {tar_file} {exclude} {contain}')
    helper.send_step('local', 5, f'完成')


class Helper:
    def __init__(self, rds, key):
        self.rds = rds
        self.key = key
        self.rds.delete(self.key)

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
        self._send({'key': key, 'data': message})

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
