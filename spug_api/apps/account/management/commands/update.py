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
        version, is_repair = settings.SPUG_VERSION, False
        res = requests.get(f'https://api.spug.cc/apis/release/latest/?version={version}').json()
        if res['error']:
            return self.stderr.write(self.style.ERROR(f'获取新版本失败：{res["error"]}'))
        if not res['data']['has_new']:
            self.stdout.write(res['data']['extra'])
            is_repair = True
            answer = input(f'\r\n当前已是最新版本，是否要进行修复性更新[y|n]？')
        else:
            version = res['data']['version']
            self.stdout.write(res['data']['content'])
            self.stdout.write('\r\n')
            self.stdout.write(res['data']['extra'])
            answer = input(f'\r\n发现新版本 {version} 是否更新[y|n]？')
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
            f'python3 ./tools/migrate.py {settings.SPUG_VERSION}'
        ]
        task = subprocess.Popen(' && '.join(commands), shell=True)
        if task.wait() != 0:
            return self.stderr.write(self.style.ERROR('更新表结构失败，请附带输出内容至官方论坛反馈。'))

        self.stdout.write(self.style.SUCCESS('''升级成功，请自行重启服务，如果通过官方文档安装一般重启命令为
        Docker: docker restart spug
        Centos: systemctl restart supervisord 
        Ubuntu: systemctl restart supervisor
        '''))
        self.stderr.write(self.style.WARNING(f'最后别忘了刷新浏览器，确保系统设置/关于里的api与web版本一致哦～'))
