from django_redis import get_redis_connection
from django.conf import settings
from libs.utils import AttrDict
from apps.host.models import Host
from datetime import datetime
from threading import Thread
import socket
import subprocess
import json
import os

REPOS_DIR = settings.REPOS_DIR


def deploy_dispatch(request, req, token):
    now = datetime.now()
    env = AttrDict(
        APP_NAME=req.app.name,
        APP_ID=str(req.app_id),
        TASK_NAME=req.name,
        TASK_ID=str(req.id),
        VERSION=f'{req.app_id}_{req.id}_{now.strftime("%Y%m%d%H%M%S")}',
        TIME=str(now.strftime('%Y-%m-%d\ %H:%M:%S'))
    )
    if req.app.extend == '1':
        env.update(json.loads(req.app.extend_obj.custom_envs))
        _ext1_deploy(request, req, token, env)
    else:
        _ext2_deploy(request, req, token, env)


def _ext1_deploy(request, req, token, env):
    app = req.app
    extend = req.app.extend_obj
    extras = json.loads(req.extra)
    if extras[0] == 'branch':
        tree_ish = extras[2]
        env.update(BRANCH=extras[1], COMMIT_ID=extras[2])
    else:
        tree_ish = extras[1]
        env.update(TAG=extras[1])
    rds = get_redis_connection()
    rds.rpush(token, json.dumps({'key': 'local', 'data': 'Starting...\n'}))
    rds.expire(token, 60 * 60)
    executor = Executor(rds, token)

    if extend.hook_pre_server:
        executor.local(f'cd /tmp && {extend.hook_pre_server}', env)

    git_dir = os.path.join(REPOS_DIR, str(app.id))
    command = f'cd {git_dir} && git archive --prefix={env.VERSION}/ {tree_ish} | (cd .. && tar xf -)'
    executor.local(command)

    if extend.hook_post_server:
        executor.local(f'cd {os.path.join(REPOS_DIR, env.VERSION)} && {extend.hook_post_server}', env)

    executor.local(f'cd {REPOS_DIR} && tar zcf {env.VERSION}.tar.gz {env.VERSION}')

    for h_id in json.loads(req.host_ids):
        Thread(target=_deploy_host, args=(executor, h_id, extend, env)).start()


def _ext2_deploy(request, req, token, env):
    pass


def _deploy_host(executor, h_id, extend, env):
    host = Host.objects.filter(pk=h_id).first()
    if not host:
        executor.send_error(h_id, 'no such host')
    ssh = host.get_ssh()
    code, _ = ssh.exec_command(f'mkdir -p {extend.dst_repo} && [ -e {extend.dst_dir} ] && [ ! -L {extend.dst_dir} ]')
    if code == 0:
        executor.send_error(host.id, f'please make sure the {extend.dst_dir!r} is not exists.')
    # transfer files
    tar_gz_file = f'{env.VERSION}.tar.gz'
    executor.send_info(host.id, 'Transferring files ...')
    try:
        ssh.put_file(os.path.join(REPOS_DIR, tar_gz_file), os.path.join(extend.dst_repo, tar_gz_file))
    except Exception as e:
        executor.send_error(host.id, f'exception: {e}')

    command = f'cd {extend.dst_repo} && tar xf {tar_gz_file} && rm -f {env.APP_ID}_*.tar.gz'
    executor.remote(host.id, ssh, command)
    # exit_code, out = ssh.exec_command()
    # if exit_code != 0:
    #     executor.send_error(host.id, f'{out}\r\nexit code: {exit_code}')

    repo_dir = os.path.join(extend.dst_repo, env.VERSION)
    # pre host
    if extend.hook_pre_host:
        command = f'cd {repo_dir} && {extend.hook_pre_host}'
        executor.remote(host.id, ssh, command, env)

    # do deploy
    tmp_path = os.path.join(extend.dst_repo, f'tmp_{env.VERSION}')
    executor.remote(host.id, ssh, f'ln -sfn {repo_dir} {tmp_path} && mv -fT {tmp_path} {extend.dst_dir}')
    # exit_code, out = ssh.exec_command(f'')
    # if exit_code != 0:
    #     executor.send_error(host.id, f'{out}\r\nexit code: {exit_code}')

    # post host
    if extend.hook_post_host:
        command = f'cd {extend.dst_dir} && {extend.hook_post_host}'
        executor.remote(host.id, ssh, command, env)

    executor.send_done(host.id)


class Executor:
    def __init__(self, rds, token):
        self.rds = rds
        self.token = token

    def send_info(self, key, message):
        self.rds.lpush(self.token, json.dumps({'key': key, 'status': 'info', 'data': message}))

    def send_error(self, key, message):
        self.rds.lpush(self.token, json.dumps({'key': key, 'status': 'error', 'data': message}))
        raise Exception(message)

    def send_done(self, key):
        self.rds.lpush(self.token, json.dumps({'key': key, 'status': 'done'}))

    def local(self, command, env=None):
        print(f'executor.local: {command!r}')
        task = subprocess.Popen(command, env=env, shell=True, stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
        while True:
            message = task.stdout.readline()
            if not message:
                break
            self.send_info('local', message.decode())
        if task.wait() != 0:
            self.send_error('local', f'exit code: {task.returncode}')

    def remote(self, key, ssh, command, env=None):
        print(f'executor.remote: {command!r} env: {env!r}')
        code = -1
        try:
            for code, out in ssh.exec_command_with_stream(command, environment=env):
                self.send_info(key, out)
            if code != 0:
                self.send_error(key, f'exit code: {code}')
        except socket.timeout:
            self.send_error(key, 'time out')
