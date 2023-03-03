# Copyright: (c) OpenSpug Organization. https://github.com/openspug/spug
# Copyright: (c) <spug.dev@gmail.com>
# Released under the AGPL-3.0 License.
from django.conf import settings
from apps.credential.models import Credential
from apps.host.models import Host
from libs.utils import AttrDict, str_decode
from libs.gitlib import RemoteGit
from apps.pipeline.helper import Helper
from apps.setting.utils import AppSetting
from functools import partial
from threading import Thread
from concurrent import futures
from uuid import uuid4
import subprocess
import tempfile
import time
import os


class NodeExecutor:
    def __init__(self, rds, rds_key, nodes):
        self.rds = rds
        self.rds_key = rds_key
        self.nodes = {x.id: x for x in map(AttrDict, nodes)}
        self.node = AttrDict(nodes[0])
        self.helper = Helper.make(self.rds, self.rds_key)
        self.max_workers = max(10, os.cpu_count() * 5)

    def run(self, node=None, state=None):
        print(node, state)
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
        print('!!!!! _dispatch', node.name)
        if node.module == 'build':
            self._do_build(node)
        elif node.module == 'ssh_exec':
            self._do_ssh_exec(node)
        elif node.module == 'data_transfer':
            self._do_data_transfer(node)

    def _do_build(self, node, marker=None):
        # if node.mode == 'branch':
        #     marker = node.branch
        timestamp = time.time()
        marker = 'origin/bugfix'
        host = Host.objects.get(pk=node.target)
        credential = None
        if node.credential_id:
            credential = Credential.objects.get(pk=node.credential_id)
        with RemoteGit(host, node.git_url, node.workspace, credential) as git:
            self.helper.send_info(node.id, '同步并检出Git仓库\r\n', 'processing')
            git.set_remote_exec(partial(self.helper.remote_exec, node.id))
            is_success = git.checkout(marker)
            if is_success and node.command:
                self.helper.send_info(node.id, '执行构建命令\r\n')
                is_success = self.helper.remote_exec(node.id, git.ssh, node.command)
            if is_success:
                self.helper.send_success(node.id, '构建完成', start_time=timestamp)
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
            is_success = self.helper.remote_exec(key, ssh, node.command)
        if is_success:
            self.helper.send_success(key, '执行结束', start_time=timestamp)
        return is_success

    def _do_data_transfer(self, node):
        self.helper.send_info(node.id, '开始执行\r\n', 'processing')
        node.source = source = AttrDict(node.source)
        node.destination = destination = AttrDict(node.destination)
        host = Host.objects.get(pk=source.target)
        with host.get_ssh() as ssh:
            code, _ = ssh.exec_command_raw(f'[ -d {source.path} ]')
            if code == 0:
                local_dir = os.path.join(settings.TRANSFER_DIR, uuid4().hex)
                os.makedirs(local_dir)
                with tempfile.NamedTemporaryFile(mode='w') as fp:
                    fp.write(host.pkey or AppSetting.get('private_key'))
                    fp.flush()
                    target = f'{host.username}@{host.hostname}:{source.path}'
                    command = f'sshfs -o ro -o ssh_command="ssh -p {host.port} -i {fp.name}" {target} {local_dir}'
                    task = subprocess.run(command, shell=True, capture_output=True)
                    if task.returncode != 0:
                        os.system(f'umount -f {local_dir} &> /dev/null ; rm -rf {local_dir}')
                        return self.helper.send_error(node.id, task.stderr.decode())

                threads = []
                with futures.ThreadPoolExecutor(max_workers=self.max_workers) as executor:
                    for host in Host.objects.filter(id__in=destination.targets):
                        t = executor.submit(self._data_transfer_dir, node, host, local_dir)
                        threads.append(t)
                    results = [x.result() for x in futures.as_completed(threads)]
                os.system(f'umount -f {local_dir} &> /dev/null ; rm -rf {local_dir}')
                state = 'success' if all(results) else 'error'
                self.helper.send_status(node.id, state)
                self.run(node, state)
            else:
                self._data_transfer_file()

    def _data_transfer_dir(self, node, host, local_dir):
        timestamp = time.time()
        key = f'{node.id}.{host.id}'
        remote_dir = node.destination.path
        self.helper.send_info(key, '开始传输数据\r\n', 'processing')
        with tempfile.NamedTemporaryFile(mode='w') as fp:
            fp.write(host.pkey or AppSetting.get('private_key'))
            fp.write('\n')
            fp.flush()

            options = '-avz --progress -h'
            argument = f'{local_dir}/ {host.username}@{host.hostname}:{remote_dir}'
            command = f'rsync {options} -e "ssh -p {host.port} -o StrictHostKeyChecking=no -i {fp.name}" {argument}'
            task = subprocess.Popen(command, shell=True, stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
            message = b''
            while True:
                output = task.stdout.read(1)
                if not output:
                    break
                if output in (b'\r', b'\n'):
                    message += b'\r\n' if output == b'\n' else b'\r'
                    message = str_decode(message)
                    if 'rsync: command not found' in message:
                        data = '\r\n\x1b[31m检测到该主机未安装rsync，可通过批量执行/执行任务模块进行以下命令批量安装\x1b[0m'
                        data += '\r\nCentos/Redhat: yum install -y rsync'
                        data += '\r\nUbuntu/Debian: apt install -y rsync'
                        self.helper.send_error(key, data)
                        break
                    self.helper.send(key, message)
                    message = b''
                else:
                    message += output
            status = task.wait()
            if status == 0:
                self.helper.send_success(key, '传输完成', start_time=timestamp)
            return status == 0

    def _data_transfer_file(self):
        pass