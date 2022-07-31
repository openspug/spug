# Copyright: (c) OpenSpug Organization. https://github.com/openspug/spug
# Copyright: (c) <spug.dev@gmail.com>
# Released under the AGPL-3.0 License.
from git import Repo, RemoteReference, TagReference, InvalidGitRepositoryError, GitCommandError
from tempfile import NamedTemporaryFile
from datetime import datetime
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
