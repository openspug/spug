# Copyright: (c) OpenSpug Organization. https://github.com/openspug/spug
# Copyright: (c) <spug.dev@gmail.com>
# Released under the AGPL-3.0 License.
from django_redis import get_redis_connection
from django.conf import settings
from django.db import close_old_connections
from libs.utils import AttrDict, human_time
from libs.healthcheck import HealthCheck
from apps.host.models import Host
from apps.config.utils import compose_configs
from apps.repository.models import Repository
from apps.repository.utils import dispatch as build_repository
from apps.deploy.helper import Helper, SpugError
from concurrent import futures
from functools import partial
import queue
import json
import uuid
import os

REPOS_DIR = settings.REPOS_DIR


def dispatch(req):
    rds = get_redis_connection()
    rds_key = f'{settings.REQUEST_KEY}:{req.id}'
    helper = Helper(rds, rds_key)
    try:
        api_token = uuid.uuid4().hex
        rds.setex(api_token, 60 * 60, f'{req.deploy.app_id},{req.deploy.env_id}')
        env = AttrDict(
            SPUG_APP_NAME=req.deploy.app.name,
            SPUG_APP_KEY=req.deploy.app.key,
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
        # append configs
        configs = compose_configs(req.deploy.app, req.deploy.env_id)
        configs_env = {f'_SPUG_{k.upper()}': v for k, v in configs.items()}
        env.update(configs_env)

        if req.deploy.extend == '1':
            _ext1_deploy(req, helper, env)
        else:
            _ext2_deploy(req, helper, env)
        req.status = '3'
    except Exception as e:
        req.status = '-3'
        raise e
    finally:
        close_old_connections()
        req.save()
        helper.clear()
        Helper.send_deploy_notify(req)


def _ext1_deploy(req, helper, env):
    if not req.repository_id:
        rep = Repository(
            app_id=req.deploy.app_id,
            env_id=req.deploy.env_id,
            deploy_id=req.deploy_id,
            version=req.version,
            spug_version=req.spug_version,
            extra=req.extra,
            remarks='SPUG AUTO MAKE',
            created_by_id=req.created_by_id
        )
        build_repository(rep, helper)
        req.repository = rep
    extend = req.deploy.extend_obj
    hc_obj = req.deploy.health_check_obj
    env.update(SPUG_DST_DIR=extend.dst_dir)
    extras = json.loads(req.extra)
    if extras[0] == 'repository':
        extras = extras[1:]
    if extras[0] == 'branch':
        env.update(SPUG_GIT_BRANCH=extras[1], SPUG_GIT_COMMIT_ID=extras[2])
    else:
        env.update(SPUG_GIT_TAG=extras[1])
    threads, latest_exception = [], None
    max_workers = max(10, os.cpu_count() * 5) if req.deploy.is_parallel else req.deploy.parallel_num
    exception_queue = queue.Queue()
    check_failed_action = 1 if not hc_obj else hc_obj.check_failed_action

    with futures.ThreadPoolExecutor(max_workers=max_workers) as executor:
        for h_id in json.loads(req.host_ids):
            new_env = AttrDict(env.items())
            t = executor.submit(_deploy_ext1_host, req, helper, h_id, new_env, exception_queue, check_failed_action)
            t.h_id = h_id
            threads.append(t)
        futures.wait(threads, return_when=futures.FIRST_EXCEPTION)
        for t in reversed(threads):
            t.cancel()
        futures.wait(threads, return_when=futures.ALL_COMPLETED)
        for t in threads:
            if "finished returned NoneType" in str(t) or t.cancelled():
                helper.send_error(t.h_id, '终止发布', False)
            elif "finished raised SpugError" in str(t):
                exception = t.exception()
                latest_exception = exception
                helper.send_error(t.h_id, f'Exception: {exception}', False)
    if latest_exception:
        raise latest_exception



def _ext2_deploy(req, helper, env):
    helper.send_info('local', f'\033[32m完成√\033[0m\r\n')
    extend, step = req.deploy.extend_obj, 1
    host_actions = json.loads(extend.host_actions)
    server_actions = json.loads(extend.server_actions)
    env.update({'SPUG_RELEASE': req.version})
    if req.version:
        for index, value in enumerate(req.version.split()):
            env.update({f'SPUG_RELEASE_{index + 1}': value})
    for action in server_actions:
        helper.send_step('local', step, f'{human_time()} {action["title"]}...\r\n')
        helper.local(f'cd /tmp && {action["data"]}', env)
        step += 1
    helper.send_step('local', 100, '')

    for action in host_actions:
        if action.get('type') == 'transfer':
            if action.get('src_mode') == '1':
                break
            helper.send_info('local', f'{human_time()} 检测到来源为本地路径的数据传输动作，执行打包...   \r\n')
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
            tar_gz_file = f'{req.spug_version}.tar.gz'
            helper.local(f'cd {sp_dir} && tar -zcf {tar_gz_file} {exclude} {contain}')
            helper.send_info('local', f'{human_time()} \033[32m完成√\033[0m\r\n')
            helper.add_callback(partial(os.remove, os.path.join(sp_dir, tar_gz_file)))
            break
    if host_actions:
        if req.deploy.is_parallel:
            threads, latest_exception = [], None
            max_workers = max(10, os.cpu_count() * 5)
            with futures.ThreadPoolExecutor(max_workers=max_workers) as executor:
                for h_id in json.loads(req.host_ids):
                    new_env = AttrDict(env.items())
                    t = executor.submit(_deploy_ext2_host, helper, h_id, host_actions, new_env, req.spug_version)
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
        else:
            host_ids = sorted(json.loads(req.host_ids), reverse=True)
            while host_ids:
                h_id = host_ids.pop()
                new_env = AttrDict(env.items())
                try:
                    _deploy_ext2_host(helper, h_id, host_actions, new_env, req.spug_version)
                except Exception as e:
                    helper.send_error(h_id, f'Exception: {e}', False)
                    for h_id in host_ids:
                        helper.send_error(h_id, '终止发布', False)
                    raise e
    else:
        helper.send_step('local', 100, f'\r\n{human_time()} ** 发布成功 **')


def _deploy_ext1_host(req, helper, h_id, env, exception_queue, failed_action=1):
    # 异常队列不为空 且动作是中断发布   0 中断所有 1 忽略继续
    if not exception_queue.empty() and failed_action == 0:
        return
    extend = req.deploy.extend_obj
    hc_obj = req.deploy.health_check_obj
    helper.send_step(h_id, 1, f'\033[32m就绪√\033[0m\r\n{human_time()} 数据准备...        ')
    host = Host.objects.filter(pk=h_id).first()
    if not host:
        helper.send_error(h_id, 'no such host')
    env.update({'SPUG_HOST_ID': h_id, 'SPUG_HOST_NAME': host.hostname})
    with host.get_ssh(default_env=env) as ssh:
        base_dst_dir = os.path.dirname(extend.dst_dir)
        code, _ = ssh.exec_command_raw(
            f'mkdir -p {extend.dst_repo} {base_dst_dir} && [ -e {extend.dst_dir} ] && [ ! -L {extend.dst_dir} ]')
        if code == 0:
            helper.send_error(host.id, f'检测到该主机的发布目录 {extend.dst_dir!r} 已存在，为了数据安全请自行备份后删除该目录，Spug 将会创建并接管该目录。')
        if req.type == '2':
            helper.send_step(h_id, 1, '\033[33m跳过√\033[0m\r\n')
        else:
            # clean
            clean_command = f'ls -d {extend.deploy_id}_* 2> /dev/null | sort -t _ -rnk2 | tail -n +{extend.versions + 1} | xargs rm -rf'
            helper.remote_raw(host.id, ssh, f'cd {extend.dst_repo} && {clean_command}')
            # transfer files
            tar_gz_file = f'{req.spug_version}.tar.gz'
            try:
                ssh.put_file(os.path.join(REPOS_DIR, 'build', tar_gz_file), os.path.join(extend.dst_repo, tar_gz_file))
            except Exception as e:
                helper.send_error(host.id, f'Exception: {e}')

            command = f'cd {extend.dst_repo} && rm -rf {req.spug_version} && tar xf {tar_gz_file} && rm -f {req.deploy_id}_*.tar.gz'
            helper.remote_raw(host.id, ssh, command)
            helper.send_step(h_id, 1, '\033[32m完成√\033[0m\r\n')

        # pre host
        repo_dir = os.path.join(extend.dst_repo, req.spug_version)
        if extend.hook_pre_host:
            helper.send_step(h_id, 2, f'{human_time()} 发布前任务...       \r\n')
            command = f'cd {repo_dir} && {extend.hook_pre_host}'
            helper.remote(host.id, ssh, command)

        # do deploy
        helper.send_step(h_id, 3, f'{human_time()} 执行发布...        ')
        helper.remote_raw(host.id, ssh, f'rm -f {extend.dst_dir} && ln -sfn {repo_dir} {extend.dst_dir}')
        helper.send_step(h_id, 3, '\033[32m完成√\033[0m\r\n')

        # post host
        if extend.hook_post_host:
            helper.send_step(h_id, 4, f'{human_time()} 发布后任务...       \r\n')
            command = f'cd {extend.dst_dir} && {extend.hook_post_host}'
            helper.remote(host.id, ssh, command)

        # healthcheck
        if hc_obj:
            if hc_obj.is_health_check_enabled:
                helper.send_step(h_id, 4, f'{human_time()} 执行健康检查...       \r\n')
                hc = HealthCheck(host=host.hostname, host_id=h_id, helper=helper, **hc_obj.__dict__)
                health_status = hc.is_health()
                if not health_status and failed_action == 0:
                    exception_queue.put("quit")
                    helper.send_error(h_id, f'{human_time()} 健康检查失败...       \r\n')
                    # raise Exception
                else:
                    helper.send_step(h_id, 4, f'{human_time()} 健康检查通过...       \r\n')

        helper.send_step(h_id, 100, f'\r\n{human_time()} ** \033[32m发布成功\033[0m **')
        return True


def _deploy_ext2_host(helper, h_id, actions, env, spug_version):
    helper.send_info(h_id, '\033[32m就绪√\033[0m\r\n')
    host = Host.objects.filter(pk=h_id).first()
    if not host:
        helper.send_error(h_id, 'no such host')
    env.update({'SPUG_HOST_ID': h_id, 'SPUG_HOST_NAME': host.hostname})
    with host.get_ssh(default_env=env) as ssh:
        for index, action in enumerate(actions):
            helper.send_step(h_id, 1 + index, f'{human_time()} {action["title"]}...\r\n')
            if action.get('type') == 'transfer':
                if action.get('src_mode') == '1':
                    try:
                        ssh.put_file(os.path.join(REPOS_DIR, env.SPUG_DEPLOY_ID, spug_version), action['dst'])
                    except Exception as e:
                        helper.send_error(host.id, f'Exception: {e}')
                    helper.send_info(host.id, 'transfer completed\r\n')
                    continue
                else:
                    sp_dir, sd_dst = os.path.split(action['src'])
                    tar_gz_file = f'{spug_version}.tar.gz'
                    try:
                        ssh.put_file(os.path.join(sp_dir, tar_gz_file), f'/tmp/{tar_gz_file}')
                    except Exception as e:
                        helper.send_error(host.id, f'Exception: {e}')

                    command = f'mkdir -p /tmp/{spug_version} && tar xf /tmp/{tar_gz_file} -C /tmp/{spug_version}/ '
                    command += f'&& rm -rf {action["dst"]} && mv /tmp/{spug_version}/{sd_dst} {action["dst"]} '
                    command += f'&& rm -rf /tmp/{spug_version}* && echo "transfer completed"'
            else:
                command = f'cd /tmp && {action["data"]}'
            helper.remote(host.id, ssh, command)

    helper.send_step(h_id, 100, f'\r\n{human_time()} ** \033[32m发布成功\033[0m **')
