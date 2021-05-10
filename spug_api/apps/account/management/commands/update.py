# Copyright: (c) OpenSpug Organization. https://github.com/openspug/spug
# Copyright: (c) <spug.dev@gmail.com>
# Released under the AGPL-3.0 License.
from django.core.management.base import BaseCommand
from django.conf import settings
import subprocess
import requests
import os


class Command(BaseCommand):
    help = '升级Spug版本'

    def handle(self, *args, **options):
        res = requests.get('https://gitee.com/api/v5/repos/openspug/spug/releases/latest').json()
        version, is_repair = res.get('tag_name'), False
        if not version:
            return self.stderr.write(self.style.ERROR('获取新版本失败，排除网络问题后请附带输出内容至官方论坛反馈'))
        if version == settings.SPUG_VERSION:
            self.stdout.write(self.style.SUCCESS(''))
            is_repair = True
            answer = input(f'当前已是最新版本，是否要进行修复性更新[y|n]？')
        else:
            self.stdout.write(f'{version} 更新日志：\r\n' + res.get('body', ''))
            answer = input(f'发现新版本 {version} 是否更新[y|n]？')
        if answer.lower() != 'y':
            return

        # update web
        web_dir = os.path.join(settings.BASE_DIR, '../spug_web')
        commands = [
            f'curl -o /tmp/spug_web.tar.gz https://cdn.spug.cc/spug/web_{version}.tar.gz',
            f'rm -rf {web_dir}/build',
            f'tar xf /tmp/spug_web.tar.gz -C {web_dir}'
        ]
        task = subprocess.Popen(' && '.join(commands), shell=True)
        if task.wait() != 0:
            return self.stderr.write(self.style.ERROR('获取更新失败，排除网络问题后请附带输出内容至官方论坛反馈。'))

        # update api
        commands = [
            f'cd {settings.BASE_DIR}',
            f'git fetch origin refs/tags/{version}:refs/tags/{version} --no-tags',
            f'git checkout {version}'
        ]
        if is_repair:
            commands.insert(1, f'git tag -d {version}')
        task = subprocess.Popen(' && '.join(commands), shell=True)
        if task.wait() != 0:
            return self.stderr.write(self.style.ERROR('获取更新失败，排除网络问题后请附带输出内容至官方论坛反馈。'))

        # update dep
        commands = [
            f'cd {settings.BASE_DIR}',
            'pip3 install -r requirements.txt -i https://pypi.doubanio.com/simple/'
        ]
        task = subprocess.Popen(' && '.join(commands), shell=True)
        if task.wait() != 0:
            return self.stderr.write(self.style.ERROR('更新依赖包失败，排除网络问题后请附带输出内容至官方论坛反馈。'))

        # update db
        apps = [x.split('.')[-1] for x in settings.INSTALLED_APPS if x.startswith('apps.')]
        commands = [
            f'cd {settings.BASE_DIR}',
            f'python3 ./manage.py makemigrations ' + ' '.join(apps),
            f'python3 ./manage.py migrate',
            f'python3 ./tools/migrate.py {version}'
        ]
        task = subprocess.Popen(' && '.join(commands), shell=True)
        if task.wait() != 0:
            return self.stderr.write(self.style.ERROR('更新表结构失败，请附带输出内容至官方论坛反馈。'))

        self.stdout.write(self.style.SUCCESS('''升级成功，请自行重启服务，如果通过官方文档安装一般重启命令为
        Docker: docker restart spug
        Centos: systemctl restart supervisord 
        Ubuntu: systemctl restart supervisor'''))
