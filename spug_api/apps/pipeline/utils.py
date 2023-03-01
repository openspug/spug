# Copyright: (c) OpenSpug Organization. https://github.com/openspug/spug
# Copyright: (c) <spug.dev@gmail.com>
# Released under the AGPL-3.0 License.
from apps.credential.models import Credential
from apps.host.models import Host
from libs.utils import AttrDict, human_seconds_time
from libs.gitlib import RemoteGit
from apps.pipeline.helper import Helper
from functools import partial, partialmethod
from threading import Thread
from concurrent import futures
import time
import os


class NodeExecutor:
    def __init__(self, rds, rds_key, nodes):
        self.rds = rds
        self.rds_key = rds_key
        self.nodes = {x.id: x for x in map(AttrDict, nodes)}
        self.node = AttrDict(nodes[0])
        self.helper = Helper.make(self.rds, self.rds_key)

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
        max_workers = max(10, os.cpu_count() * 5)
        self.helper.send_status(node.id, 'processing')
        with futures.ThreadPoolExecutor(max_workers=max_workers) as executor:
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
