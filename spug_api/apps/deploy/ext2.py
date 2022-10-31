# Copyright: (c) OpenSpug Organization. https://github.com/openspug/spug
# Copyright: (c) <spug.dev@gmail.com>
# Released under the AGPL-3.0 License.
from django.conf import settings
from libs.utils import AttrDict, render_str, human_seconds_time
from libs.executor import Executor
from apps.host.models import Host
from apps.deploy.helper import SpugError
from concurrent import futures
import json
import time
import os

REPOS_DIR = settings.REPOS_DIR


def ext2_deploy(req, helper, env, with_local):
    flag = time.time()
    extend, step = req.deploy.extend_obj, 1
    host_actions = json.loads(extend.host_actions)
    server_actions = json.loads(extend.server_actions)
    env.update({'SPUG_RELEASE': req.version})
    if req.version:
        for index, value in enumerate(req.version.split()):
            env.update({f'SPUG_RELEASE_{index + 1}': value})

    transfer_action = None
    for action in host_actions:
        if action.get('type') == 'transfer':
            action['src'] = render_str(action.get('src', '').strip().rstrip('/'), env)
            action['dst'] = render_str(action['dst'].strip().rstrip('/'), env)
            if action.get('src_mode') == '1':  # upload when publish
                if not req.extra:
                    helper.send_error('local', '\r\n未找到上传的文件信息，请尝试新建发布申请')
                extra = json.loads(req.extra)
                if 'name' in extra:
                    action['name'] = extra['name']
            else:
                transfer_action = action
            break

    if with_local or True:
        with Executor(env) as et:
            helper.save_pid(et.pid, 'local')
            helper.set_deploy_process('local')
            helper.send_success('local', '', status='doing')
            if server_actions or transfer_action:
                helper.send_clear('local')
            for action in server_actions:
                helper.send_info('local', f'{action["title"]}...\r\n')
                helper.local(et, f'cd /tmp && {action["data"]}')
                step += 1
            if transfer_action:
                action = transfer_action
                helper.send_info('local', '检测到来源为本地路径的数据传输动作，执行打包...   \r\n')
                action['src'] = action['src'].rstrip('/ ')
                action['dst'] = action['dst'].rstrip('/ ')
                if not action['src'] or not action['dst']:
                    helper.send_error('local', f'Invalid path for transfer, src: {action["src"]} dst: {action["dst"]}')
                if not os.path.exists(action['src']):
                    helper.send_error('local', f'No such file or directory: {action["src"]}')
                is_dir, exclude = os.path.isdir(action['src']), ''
                sp_dir, sd_dst = os.path.split(action['src'])
                contain = sd_dst
                if action['mode'] != '0' and is_dir:
                    files = helper.parse_filter_rule(action['rule'], ',', env)
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
                tar_gz_file = os.path.join(REPOS_DIR, env.SPUG_DEPLOY_ID, f'{req.spug_version}.tar.gz')
                helper.local_raw(f'cd {sp_dir} && tar -zcf {tar_gz_file} {exclude} {contain}')
                helper.send_info('local', '打包完成\r\n')
            helper.set_cross_env(req.spug_version, et.get_envs())
            helper.set_deploy_success('local')
            human_time = human_seconds_time(time.time() - flag)
            helper.send_success('local', f'\r\n** 执行完成，耗时：{human_time} **', status='success')

    if host_actions:
        env.update(helper.get_cross_env(req.spug_version))
        if req.deploy.is_parallel:
            threads, latest_exception = [], None
            max_workers = max(10, os.cpu_count() * 5)
            with futures.ThreadPoolExecutor(max_workers=max_workers) as executor:
                for h_id in sorted(helper.deploy_host_ids, reverse=True):
                    new_env = AttrDict(env.items())
                    t = executor.submit(_deploy_ext2_host, helper, h_id, host_actions, new_env, req.spug_version)
                    t.h_id = h_id
                    threads.append(t)
                for t in futures.as_completed(threads):
                    exception = t.exception()
                    if exception:
                        helper.set_deploy_fail(t.h_id)
                        latest_exception = exception
                        if not isinstance(exception, SpugError):
                            helper.send_error(t.h_id, f'Exception: {exception}', with_break=False)
                    else:
                        helper.set_deploy_success(t.h_id)
            if latest_exception:
                raise latest_exception
        else:
            host_ids = sorted(helper.deploy_host_ids)
            while host_ids:
                h_id = host_ids.pop()
                new_env = AttrDict(env.items())
                try:
                    _deploy_ext2_host(helper, h_id, host_actions, new_env, req.spug_version)
                    helper.set_deploy_success(h_id)
                except Exception as e:
                    helper.set_deploy_fail(h_id)
                    if not isinstance(e, SpugError):
                        helper.send_error(h_id, f'Exception: {e}', with_break=False)
                    for h_id in host_ids:
                        helper.set_deploy_fail(h_id)
                        helper.send_clear(h_id)
                        helper.send_error(h_id, '串行模式，终止发布', with_break=False)
                    raise e


def _deploy_ext2_host(helper, h_id, actions, env, spug_version):
    flag = time.time()
    helper.set_deploy_process(h_id)
    host = Host.objects.filter(pk=h_id).first()
    if not host:
        helper.send_error(h_id, 'no such host')
    env.update({'SPUG_HOST_ID': h_id, 'SPUG_HOST_NAME': host.hostname})
    with host.get_ssh(default_env=env) as ssh:
        helper.send_clear(h_id)
        helper.save_pid(ssh.get_pid(), h_id)
        helper.send_success(h_id, '', status='doing')
        for index, action in enumerate(actions, start=1):
            if action.get('type') == 'transfer':
                helper.send_info(h_id, f'{action["title"]}...')
                if action.get('src_mode') == '1':
                    try:
                        dst = action['dst']
                        command = f'[ -e {dst} ] || mkdir -p $(dirname {dst}); [ -d {dst} ]'
                        code, _ = ssh.exec_command_raw(command)
                        if code == 0:  # is dir
                            if not action.get('name'):
                                raise RuntimeError('internal error 1002')
                            dst = dst.rstrip('/') + '/' + action['name']
                        callback = helper.progress_callback(host.id)
                        ssh.put_file(os.path.join(REPOS_DIR, env.SPUG_DEPLOY_ID, spug_version), dst, callback)
                    except Exception as e:
                        helper.send_error(host.id, f'\r\nException: {e}')
                    helper.send_success(host.id, '完成√\r\n')
                else:
                    _, sd_dst = os.path.split(action['src'])
                    tar_gz_file = f'{spug_version}.tar.gz'
                    src_file = os.path.join(REPOS_DIR, env.SPUG_DEPLOY_ID, tar_gz_file)
                    try:
                        callback = helper.progress_callback(host.id)
                        ssh.put_file(src_file, f'/tmp/{tar_gz_file}', callback)
                    except Exception as e:
                        helper.send_error(host.id, f'\r\nException: {e}')
                    helper.send_success(host.id, '完成√\r\n')
                    command = f'mkdir -p /tmp/{spug_version} '
                    command += f'&& tar xf /tmp/{tar_gz_file} -C /tmp/{spug_version}/ 2> /dev/null '
                    command += f'&& rm -rf {action["dst"]} && mv /tmp/{spug_version}/{sd_dst} {action["dst"]} '
                    command += f'&& rm -rf /tmp/{spug_version}*'
                    helper.remote(host.id, ssh, command)
            else:
                helper.send_info(h_id, f'{action["title"]}...\r\n')
                command = f'cd /tmp && {action["data"]}'
                helper.remote(host.id, ssh, command)
    human_time = human_seconds_time(time.time() - flag)
    helper.send_success(h_id, f'\r\n** 发布成功，耗时：{human_time} **', status='success')
