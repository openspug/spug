# Copyright: (c) OpenSpug Organization. https://github.com/openspug/spug
# Copyright: (c) <spug.dev@gmail.com>
# Released under the AGPL-3.0 License.
from django.conf import settings
from apps.credential.models import Credential
from apps.host.models import Host
from libs.utils import AttrDict
from libs.executor import Executor
from libs.gitlib import RemoteGit
from apps.pipeline.helper import Helper
from apps.setting.utils import AppSetting
from functools import partial
from threading import Thread
from concurrent import futures
from pathlib import Path
from uuid import uuid4
import subprocess
import tempfile
import shutil
import time
import os


class NodeExecutor:
    def __init__(self, rds, token, nodes):
        self.rds = rds
        self.token = token
        self.nodes = {x.id: x for x in map(AttrDict, nodes)}
        self.node = AttrDict(nodes[0])
        self.helper = Helper.make(self.rds, self.token)
        self.max_workers = max(10, os.cpu_count() * 5)
        self.env = {}

    def run(self, node=None, state=None):
        print('!!!!! _dispatch', node.name if node else '', state)
        if node:
            downstream = getattr(node, 'downstream', [])
            down_nodes = [self.nodes[x] for x in downstream]
            available_nodes = [x for x in down_nodes if x.condition in (state, 'always')]
            if len(available_nodes) >= 2:
                for node in available_nodes[1:]:
                    Thread(target=self._dispatch, args=(node,)).start()
            if available_nodes:
                self._dispatch(available_nodes[0])
        else:
            self._dispatch(self.node)

    def _dispatch(self, node):
        if node.module == 'build':
            self._do_build(node)
        elif node.module == 'ssh_exec':
            self._do_ssh_exec(node)
        elif node.module == 'data_transfer':
            self._do_data_transfer(node)
        elif node.module == 'data_upload':
            self._do_data_upload(node)
        elif node.module == 'parameter':
            self._do_parameter(node)

    def _do_parameter(self, node):
        self.helper.send_info(node.id, '解析参数配置\r\n', 'processing')
        dynamic_params = node.get('dynamic_params')
        if dynamic_params:
            self.helper.send(node.id, '\r\n动态参数：\r\n')
            for key, value in dynamic_params.items():
                self.helper.send(node.id, f'  {key} = {value}\r\n')
                self.env[key] = value

        static_params = node.get('static_params')
        if static_params:
            self.helper.send(node.id, '\r\n静态参数：\r\n')
            for item in static_params:
                self.helper.send(node.id, f'  {item[0]} = {item[1]}\r\n')
                self.env[item[0]] = item[1]
        self.helper.send_success(node.id, '参数解析完成')
        self.run(node, 'success')

    def _do_build(self, node, marker=None):
        # if node.mode == 'branch':
        #     marker = node.branch
        timestamp = time.time()
        marker = 'origin/bugfix'
        host = Host.objects.get(pk=node.target)
        credential = None
        if node.credential_id:
            credential = Credential.objects.get(pk=node.credential_id)
        self.helper.send_info(node.id, '同步并检出Git仓库\r\n', 'processing')
        with RemoteGit(host, node.git_url, node.workspace, credential) as git:
            pid_key = f'{self.token}.{node.id}.{host.id}'
            self.rds.set(pid_key, f'{host.id}.{git.ssh.get_pid()}', 3600)
            git.set_remote_exec(partial(self.helper.remote_exec, node.id))
            is_success = git.checkout(marker)
            if is_success and node.command:
                self.helper.send_info(node.id, '执行构建命令\r\n')
                is_success = self.helper.remote_exec(node.id, git.ssh, node.command, self.env)
            if is_success:
                is_success, envs = self.helper.get_dynamic_envs(node.id, git.ssh)
                if is_success:
                    self.env.update(envs)
                    self.helper.send_success(node.id, '构建完成', start_time=timestamp)
        self.rds.delete(pid_key)
        self.run(node, 'success' if is_success else 'error')

    def _do_ssh_exec(self, node):
        threads = []
        self.helper.send_status(node.id, 'processing')
        with futures.ThreadPoolExecutor(max_workers=self.max_workers) as executor:
            for host in Host.objects.filter(id__in=node.targets):
                t = executor.submit(self._ssh_exec, host, node)
                threads.append(t)
            results = [x.result() for x in futures.as_completed(threads)]
        state = 'success' if all(results) else 'error'
        self.helper.send_status(node.id, state)
        self.run(node, state)

    def _ssh_exec(self, host, node):
        timestamp = time.time()
        key = f'{node.id}.{host.id}'
        self.helper.send_info(key, '开始执行\r\n', 'processing')
        with host.get_ssh() as ssh:
            pid_key = f'{self.token}.{node.id}.{host.id}'
            self.rds.set(pid_key, f'{host.id}.{ssh.get_pid()}', 3600)
            is_success = self.helper.remote_exec(key, ssh, node.command, self.env)
        self.rds.delete(pid_key)
        if is_success:
            self.helper.send_success(key, '执行结束', start_time=timestamp)
        return is_success

    def _do_data_transfer(self, node):
        self.helper.send_info(node.id, '开始执行\r\n', 'processing')
        node.source = source = AttrDict(node.source)
        node.destination = destination = AttrDict(node.destination)
        host = Host.objects.get(pk=source.target)
        local_dir = os.path.join(settings.TRANSFER_DIR, uuid4().hex)
        os.makedirs(local_dir)
        remote_dir = f'{host.username}@{host.hostname}:{source.path}'
        with host.get_ssh() as ssh:
            code, _ = ssh.exec_command_raw(f'[ -f {source.path} ]')
        if code == 0:
            remote_dir = f'{host.username}@{host.hostname}:{os.path.dirname(source.path)}'
            local_path = os.path.join(local_dir, os.path.basename(source.path))
        else:
            local_path = local_dir + '/'

        with tempfile.NamedTemporaryFile(mode='w') as fp:
            fp.write(host.pkey or AppSetting.get('private_key'))
            fp.flush()

            command = f'sshfs -o ro -o ssh_command="ssh -p {host.port} -i {fp.name}" {remote_dir} {local_dir}'
            task = subprocess.run(command, shell=True, capture_output=True)
            if task.returncode != 0:
                error_msg = task.stderr.decode()
                os.system(f'umount -f {local_dir} &> /dev/null ; rm -rf {local_dir}')
                for host_id in destination.targets:
                    self.helper.send_error(f'{node.id}.{host_id}', error_msg)
                return self.helper.send_error(node.id, error_msg)

        threads = []
        with futures.ThreadPoolExecutor(max_workers=self.max_workers) as executor:
            for host in Host.objects.filter(id__in=destination.targets):
                t = executor.submit(self._data_transfer, node, host, local_path, destination.path)
                threads.append(t)
            results = [x.result() for x in futures.as_completed(threads)]
        os.system(f'umount -f {local_dir} &> /dev/null ; rm -rf {local_dir}')
        state = 'success' if all(results) else 'error'
        self.helper.send_status(node.id, state)
        self.run(node, state)

    def _data_transfer(self, node, host, local_path, remote_path):
        # TODO：支持--delete参数，页面上添加是否删除选项
        timestamp = time.time()
        key = f'{node.id}.{host.id}'
        self.helper.send_info(key, '开始传输数据\r\n', 'processing')
        with tempfile.NamedTemporaryFile(mode='w') as fp:
            fp.write(host.pkey or AppSetting.get('private_key'))
            fp.write('\n')
            fp.flush()

            options = '-avz --progress -h'
            argument = f'{local_path} {host.username}@{host.hostname}:{remote_path}'
            command = f'rsync {options} -e "ssh -p {host.port} -o StrictHostKeyChecking=no -i {fp.name}" {argument}'
            with Executor() as et:
                pid_key = f'{self.token}.{node.id}.{host.id}'
                self.rds.set(pid_key, f'local.{et.pid}', 3600)
                is_success = self.helper.local_exec(key, et, command)
            self.rds.delete(pid_key)
            if is_success:
                self.helper.send_success(key, '传输完成', start_time=timestamp)
            return is_success

    def _do_data_upload(self, node):
        self.helper.send_info(node.id, '开始执行\r\n', 'processing')
        local_path = Path(settings.TRANSFER_DIR) / self.token / str(node.id)
        threads = []
        with futures.ThreadPoolExecutor(max_workers=self.max_workers) as executor:
            for host in Host.objects.filter(id__in=node.targets):
                t = executor.submit(self._data_transfer, node, host, f'{local_path}/', node.path)
                threads.append(t)
            results = [x.result() for x in futures.as_completed(threads)]
        shutil.rmtree(local_path)
        state = 'success' if all(results) else 'error'
        self.helper.send_status(node.id, state)
        self.run(node, state)
