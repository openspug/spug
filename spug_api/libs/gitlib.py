# Copyright: (c) OpenSpug Organization. https://github.com/openspug/spug
# Copyright: (c) <spug.dev@gmail.com>
# Released under the MIT License.
from git import Repo, RemoteReference, TagReference, InvalidGitRepositoryError
import shutil
import os


class Git:
    def __init__(self, git_repo, repo_dir):
        self.repo = self._get_repo(git_repo, repo_dir)

    def archive(self, filepath, commit):
        with open(filepath, 'wb') as f:
            self.repo.archive(f, commit)

    def fetch_branches_tags(self):
        self.repo.remotes.origin.fetch()
        branches, tags = {}, {}
        for ref in self.repo.references:
            if isinstance(ref, RemoteReference):
                if ref.remote_head != 'HEAD':
                    branches[ref.remote_head] = self._get_commits(f'origin/{ref.remote_head}')
            elif isinstance(ref, TagReference):
                tags[ref.name] = {
                    'id': ref.tag.hexsha,
                    'author': ref.tag.tagger.name,
                    'date': ref.tag.tagged_date,
                    'message': ref.tag.message.strip()
                } if ref.tag else {}
        return branches, tags

    def _get_repo(self, git_repo, repo_dir):
        if os.path.exists(repo_dir):
            try:
                return Repo(repo_dir)
            except InvalidGitRepositoryError:
                if os.path.isdir(repo_dir):
                    shutil.rmtree(repo_dir)
                else:
                    os.remove(repo_dir)
        return Repo.clone_from(git_repo, repo_dir)

    def _get_commits(self, branch, count=10):
        commits = []
        for commit in self.repo.iter_commits(branch):
            if len(commits) == count:
                break
            commits.append({
                'id': commit.hexsha,
                'author': commit.author.name,
                'date': commit.committed_date,
                'message': commit.message.strip()
            })
        return commits
