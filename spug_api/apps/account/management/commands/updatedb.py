# Copyright: (c) OpenSpug Organization. https://github.com/openspug/spug
# Copyright: (c) <spug.dev@gmail.com>
# Released under the AGPL-3.0 License.
from django.core.management.base import BaseCommand
from django.core.management import execute_from_command_line
from django.conf import settings


class Command(BaseCommand):
    help = '初始化/更新数据库'

    def handle(self, *args, **options):
        args = ['manage.py', 'makemigrations']
        apps = [x.split('.')[-1] for x in settings.INSTALLED_APPS if x.startswith('apps.')]
        execute_from_command_line(args + apps)
        execute_from_command_line(['manage.py', 'migrate'])
        self.stdout.write(self.style.SUCCESS('初始化/更新成功'))
