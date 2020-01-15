# Copyright: (c) OpenSpug Organization. https://github.com/openspug/spug
# Copyright: (c) <spug.dev@gmail.com>
# Released under the MIT License.
from django.conf import settings
from apps.app.models import Deploy
from libs.gitlib import Git
import os


def parse_envs(text):
    data = {}
    if text:
        for line in text.split('\n'):
            fields = line.split('=', 1)
            if len(fields) != 2 or fields[0].strip() == '':
                raise Exception(f'解析自定义全局变量{line!r}失败，确认其遵循 key = value 格式')
            data[fields[0].strip()] = fields[1].strip()
    return data


def fetch_versions(deploy: Deploy):
    git_repo = deploy.extend_obj.git_repo
    repo_dir = os.path.join(settings.REPOS_DIR, str(deploy.id))
    return Git(git_repo, repo_dir).fetch_branches_tags()
