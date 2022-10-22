# Copyright: (c) OpenSpug Organization. https://github.com/openspug/spug
# Copyright: (c) <spug.dev@gmail.com>
# Released under the AGPL-3.0 License.
from django_redis import get_redis_connection
from django.conf import settings
from django.db import close_old_connections
from libs.utils import AttrDict, human_datetime, render_str, human_seconds_time
from apps.repository.models import Repository
from apps.app.utils import fetch_repo
from apps.config.utils import compose_configs
from apps.deploy.helper import Helper
import json
import uuid
import time
import os

REPOS_DIR = settings.REPOS_DIR
BUILD_DIR = settings.BUILD_DIR


def dispatch(rep: Repository, helper=None):
    rep.status = '1'
    alone_build = helper is None
    if not helper:
        rds = get_redis_connection()
        helper = Helper.make(rds, rep.deploy_key, ['local'])
        rep.save()
    try:
        api_token = uuid.uuid4().hex
        helper.rds.setex(api_token, 60 * 60, f'{rep.app_id},{rep.env_id}')
        env = AttrDict(
            SPUG_APP_NAME=rep.app.name,
            SPUG_APP_KEY=rep.app.key,
            SPUG_APP_ID=str(rep.app_id),
            SPUG_DEPLOY_ID=str(rep.deploy_id),
            SPUG_BUILD_ID=str(rep.id),
            SPUG_ENV_ID=str(rep.env_id),
            SPUG_ENV_KEY=rep.env.key,
            SPUG_VERSION=rep.version,
            SPUG_BUILD_VERSION=rep.spug_version,
            SPUG_API_TOKEN=api_token,
            SPUG_REPOS_DIR=REPOS_DIR,
        )
        helper.send_clear('local')
        helper.send_info('local', f'应用名称: {rep.app.name}\r\n', with_time=False)
        helper.send_info('local', f'执行环境: {rep.env.name}\r\n', with_time=False)
        extras = json.loads(rep.extra)
        if extras[0] == 'branch':
            env.update(SPUG_GIT_BRANCH=extras[1], SPUG_GIT_COMMIT_ID=extras[2])
            helper.send_info('local', f'代码分支: {extras[1]}/{extras[2][:8]}\r\n', with_time=False)
        else:
            env.update(SPUG_GIT_TAG=extras[1])
            helper.send_info('local', f'代码版本: {extras[1]}', with_time=False)
        helper.send_info('local', f'执行人员: {rep.created_by.nickname}\r\n', with_time=False)
        helper.send_info('local', f'执行时间: {human_datetime()}\r\n', with_time=False)
        helper.send_warn('local', '.' * 50 + '\r\n\r\n')
        helper.send_info('local', '构建准备...        ', status='doing')

        # append configs
        configs = compose_configs(rep.app, rep.env_id)
        configs_env = {f'_SPUG_{k.upper()}': v for k, v in configs.items()}
        env.update(configs_env)

        _build(rep, helper, env)
        rep.status = '5'
    except Exception as e:
        rep.status = '2'
        raise e
    finally:
        helper.local(f'cd {REPOS_DIR} && rm -rf {rep.spug_version}')
        close_old_connections()
        if alone_build:
            helper.clear()
            rep.save()
            return rep
        elif rep.status == '5':
            rep.save()


def _build(rep: Repository, helper, env):
    flag = time.time()
    extend = rep.deploy.extend_obj
    git_dir = os.path.join(REPOS_DIR, str(rep.deploy_id))
    build_dir = os.path.join(REPOS_DIR, rep.spug_version)
    tar_file = os.path.join(BUILD_DIR, f'{rep.spug_version}.tar.gz')
    env.update(SPUG_DST_DIR=render_str(extend.dst_dir, env))
    fetch_repo(rep.deploy_id, extend.git_repo)
    helper.send_success('local', '完成√\r\n')

    if extend.hook_pre_server:
        helper.send_info('local', '检出前任务...\r\n')
        helper.local(f'cd {git_dir} && {extend.hook_pre_server}', env)

    helper.send_info('local', '执行检出...        ')
    tree_ish = env.get('SPUG_GIT_COMMIT_ID') or env.get('SPUG_GIT_TAG')
    command = f'cd {git_dir} && git archive --prefix={rep.spug_version}/ {tree_ish} | (cd .. && tar xf -)'
    helper.local(command)
    helper.send_success('local', '完成√\r\n')

    if extend.hook_post_server:
        helper.send_info('local', '检出后任务...\r\n')
        helper.local(f'cd {build_dir} && {extend.hook_post_server}', env)

    helper.send_info('local', '执行打包...        ')
    filter_rule, exclude, contain = json.loads(extend.filter_rule), '', rep.spug_version
    files = helper.parse_filter_rule(filter_rule['data'], env=env)
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
    helper.local(f'mkdir -p {BUILD_DIR} && cd {REPOS_DIR} && tar zcf {tar_file} {exclude} {contain}')
    helper.send_success('local', '完成√\r\n')
    human_time = human_seconds_time(time.time() - flag)
    helper.send_success('local', f'\r\n** 构建成功，耗时：{human_time} **\r\n', status='success')
