# Copyright: (c) OpenSpug Organization. https://github.com/openspug/spug
# Copyright: (c) <spug.dev@gmail.com>
# Released under the MIT License.
from django.core.management.base import BaseCommand
from django.core.management import call_command
from django.conf import settings
import subprocess
import requests
import os


class Command(BaseCommand):
    help = '升级Spug版本'

    def handle(self, *args, **options):
        res = requests.get('https://gitee.com/api/v5/repos/openspug/spug/releases/latest').json()
        version = res.get('tag_name')
        if not version:
            return self.stderr.write(self.style.ERROR('获取新版本失败，排除网络问题后可至官方论坛反馈'))
        if version == settings.SPUG_VERSION:
            return self.stdout.write(self.style.SUCCESS('当前已是最新版本'))
        answer = input(f'发现新版本 {version} 是否更新[y|n]？')
        if answer.lower() != 'y':
            return

        # update web
        web_dir = os.path.join(settings.BASE_DIR, '../spug_web')
        commands = [
            f'curl -o /tmp/spug_web.tar.gz https://spug.dev/installer/web_{version}.tar.gz',
            f'rm -rf {web_dir}/build',
            f'tar xf /tmp/spug_web.tar.gz -C {web_dir}'
        ]
        task = subprocess.Popen(' && '.join(commands), shell=True)
        if task.wait() != 0:
            return self.stderr.write(self.style.ERROR('获取更新失败，排除网络问题后可至官方论坛反馈。'))

        # update api
        commands = [
            f'cd {settings.BASE_DIR}',
            f'git fetch origin refs/tags/{version}:refs/tags/{version} --no-tags',
            f'git checkout {version}'
        ]
        task = subprocess.Popen(' && '.join(commands), shell=True)
        if task.wait() != 0:
            return self.stderr.write(self.style.ERROR('获取更新失败，排除网络问题后可至官方论坛反馈。'))

        # update dep
        commands = [
            f'cd {settings.BASE_DIR}',
            'pip install -r requirements.txt'
        ]
        task = subprocess.Popen(' && '.join(commands), shell=True)
        if task.wait() != 0:
            return self.stderr.write(self.style.ERROR('更新依赖包失败，排除网络问题后可至官方论坛反馈。'))

        # update db
        apps = [x.split('.')[-1] for x in settings.INSTALLED_APPS if x.startswith('apps.')]
        call_command('makemigrations', *apps)
        call_command('migrate')

        self.stdout.write(self.style.SUCCESS('''升级成功，请自行重启服务，如果通过官方文档安装一般重启命令为
        Docker: docker restart $CONTAINER_ID
        Centos: systemctl restart supervisord 
        Ubuntu: systemctl restart supervisor'''))
