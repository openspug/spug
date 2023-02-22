# Copyright: (c) OpenSpug Organization. https://github.com/openspug/spug
# Copyright: (c) <spug.dev@gmail.com>
# Released under the AGPL-3.0 License.
from git import Repo, RemoteReference, TagReference, InvalidGitRepositoryError, GitCommandError
from tempfile import NamedTemporaryFile
from datetime import datetime
from io import StringIO
import subprocess
import shutil
import os


class Git:
    def __init__(self, git_repo, repo_dir, pkey=None):
        self.git_repo = git_repo
        self.repo_dir = repo_dir
        self.repo = None
        self.pkey = pkey
        self.fd = None
        self.env = {}

    def archive(self, filepath, commit):
        with open(filepath, 'wb') as f:
            self.repo.archive(f, commit)

    def fetch_branches_tags(self):
        self.fetch()
        branches, tags = {}, {}
        for ref in self.repo.references:
            if isinstance(ref, RemoteReference):
                if ref.remote_head != 'HEAD':
                    branches[ref.remote_head] = self._get_commits(f'origin/{ref.remote_head}', 30)
            elif isinstance(ref, TagReference):
                tags[ref.name] = {
                    'id': ref.tag.hexsha,
                    'author': ref.tag.tagger.name,
                    'date': self._format_date(ref.tag.tagged_date),
                    'message': ref.tag.message.strip()
                } if ref.tag else {
                    'id': ref.commit.binsha.hex(),
                    'author': ref.commit.author.name,
                    'date': self._format_date(ref.commit.authored_date),
                    'message': ref.commit.message.strip()
                }
        tags = sorted(tags.items(), key=lambda x: x[1]['date'], reverse=True)
        return branches, dict(tags)

    def fetch(self):
        kwargs = dict(f=True, p=True)
        if self.repo.git.version_info >= (2, 17, 0):
            kwargs.update(P=True)
        try:
            self.repo.remotes.origin.fetch(**kwargs)
        except GitCommandError as e:
            if self.env:
                self.repo.remotes.origin.fetch(env=self.env, **kwargs)
            else:
                raise e

    def _get_repo(self):
        if os.path.exists(self.repo_dir):
            try:
                return Repo(self.repo_dir)
            except InvalidGitRepositoryError:
                if os.path.isdir(self.repo_dir):
                    shutil.rmtree(self.repo_dir)
                else:
                    os.remove(self.repo_dir)
        try:
            repo = Repo.clone_from(self.git_repo, self.repo_dir)
        except GitCommandError as e:
            if self.env:
                repo = Repo.clone_from(self.git_repo, self.repo_dir, env=self.env)
            else:
                raise e
        return repo

    def _get_commits(self, branch, count=10):
        commits = []
        for commit in self.repo.iter_commits(branch):
            if len(commits) == count:
                break
            commits.append({
                'id': commit.hexsha,
                'author': commit.author.name,
                'date': self._format_date(commit.committed_date),
                'message': commit.message.strip()
            })
        return commits

    def _format_date(self, timestamp):
        if isinstance(timestamp, int):
            date = datetime.fromtimestamp(timestamp)
            return date.strftime('%Y-%m-%d %H:%M')
        return timestamp

    def __enter__(self):
        if self.pkey:
            self.fd = NamedTemporaryFile()
            self.fd.write(self.pkey.encode())
            self.fd.flush()
            self.env = {'GIT_SSH_COMMAND': f'ssh -o StrictHostKeyChecking=no -i {self.fd.name}'}
        self.repo = self._get_repo()
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        if self.fd:
            self.fd.close()


class RemoteGit:
    def __init__(self, host, url, path, credential=None):
        self.ssh = host.get_ssh()
        self.url = url
        self.path = path
        self.credential = credential
        self._ask_env = None

    def _make_ask_env(self):
        if not self.credential:
            return None
        if self._ask_env:
            return self._ask_env
        ask_file = f'{self.ssh.exec_file}.1'
        if self.credential.type == 'pw':
            env = dict(GIT_ASKPASS=ask_file)
            body = '#!/bin/bash\n'
            body += 'case "$1" in\n'
            body += '  Username*)\n'
            body += '    echo "{0.username}";;\n'
            body += '  Password*)\n'
            body += '    echo "{0.secret}";;\n'
            body += 'esac'
            body = body.format(self.credential)
            self.ssh.put_file_by_fl(StringIO(body), ask_file)
        else:
            env = dict(GIT_SSH=ask_file)
            key_file = f'{self.ssh.exec_file}.2'
            self.ssh.put_file_by_fl(StringIO(self.credential.secret), key_file)
            self.ssh.sftp.chmod(key_file, 0o600)
            body = f'ssh -o StrictHostKeyChecking=no -i {key_file} $@'
            self.ssh.put_file_by_fl(StringIO(body), ask_file)
        self.ssh.sftp.chmod(ask_file, 0o755)
        return env

    def _check_path(self):
        body = f'git rev-parse --resolve-git-dir {self.path}/.git'
        code, _ = self.ssh.exec_command(body)
        return code == 0

    @classmethod
    def check_auth(cls, url, credential=None):
        env = dict()
        if credential:
            if credential.type == 'pw':
                ask_command = '#!/bin/bash\n'
                ask_command += 'case "$1" in\n'
                ask_command += '  Username*)\n'
                ask_command += '    echo "{0.username}";;\n'
                ask_command += '  Password*)\n'
                ask_command += '    echo "{0.secret}";;\n'
                ask_command += 'esac'
                ask_command = ask_command.format(credential)
                ask_file = NamedTemporaryFile()
                ask_file.write(ask_command.encode())
                ask_file.flush()
                os.chmod(ask_file.name, 0o755)
                env.update(GIT_ASKPASS=ask_file.name)
                print(ask_file.name)
            else:
                key_file = NamedTemporaryFile()
                key_file.write(credential.secret.encode())
                key_file.flush()
                os.chmod(key_file.name, 0o600)
                ask_command = f'ssh -o StrictHostKeyChecking=no -i {key_file.name} $@'
                ask_file = NamedTemporaryFile()
                ask_file.write(ask_command.encode())
                ask_file.flush()
                os.chmod(ask_file.name, 0o755)
                env.update(GIT_SSH=ask_file.name)
                print(ask_file.name)
                print(key_file.name)

        command = f'git ls-remote -h {url} HEAD'
        res = subprocess.run(command, shell=True, capture_output=True, env=env)
        return res.returncode == 0, res.stderr.decode()

    def clone(self):
        env = self._make_ask_env()
        code, out = self.ssh.exec_command(f'git clone {self.url} {self.path}', env)
        if code != 0:
            raise Exception(out)

    def fetch_branches_tags(self):
        body = f'set -e\ncd {self.path}\n'
        if not self._check_path():
            self.clone()
        else:
            body += 'git fetch -q --tags --force\n'

        body += 'git --no-pager branch -r --format="%(refname:short)" | grep -v /HEAD | while read branch; do\n'
        body += '  echo "Branch: $branch"\n'
        body += '  git --no-pager log -20 --date="format-local:%Y-%m-%d %H:%M" --format="%H %cd %cn %s" $branch\n'
        body += 'done\n'
        body += 'echo "Tags:"\n'
        body += 'git --no-pager for-each-ref --format="%(refname:short) %(if)%(taggername)%(then)%(taggername)'
        body += '%(else)%(authorname)%(end) %(creatordate:format-local:%Y-%m-%d %H:%M) %(subject)" '
        body += '--sort=-creatordate refs/tags\n'
        env = self._make_ask_env()
        code, out = self.ssh.exec_command(body, env)
        if code != 0:
            raise Exception(out)
        branches, tags, each = {}, [], []
        for line in out.splitlines():
            if line.startswith('Branch:'):
                branch = line.split()[-1]
                branches[branch] = each = []
            elif line.startswith('Tags:'):
                tags = each = []
            else:
                each.append(line)
        return branches, tags

    def checkout(self, marker):
        body = f'set -e\ncd {self.path}\n'
        if not self._check_path():
            self.clone()
        else:
            body += 'git fetch -q --tags --force\n'

        body += f'git checkout -f {marker}'
        env = self._make_ask_env()
        code, out = self.ssh.exec_command(body, env)
        if code != 0:
            raise Exception(out)

    def __enter__(self):
        self.ssh.get_client()
        return self

    def __exit__(self, *args, **kwargs):
        self.ssh.client.close()
        self.ssh.client = None
