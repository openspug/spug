# Copyright: (c) OpenSpug Organization. https://github.com/openspug/spug
# Copyright: (c) <spug.dev@gmail.com>
# Released under the AGPL-3.0 License.
from django.core.management.base import BaseCommand
from apps.setting.utils import AppSetting


class Command(BaseCommand):
    help = '系统设置'

    def add_arguments(self, parser):
        parser.add_argument('target', type=str, help='设置对象')
        parser.add_argument('value', type=str, help='设置值')

    def echo_success(self, msg):
        self.stdout.write(self.style.SUCCESS(msg))

    def echo_error(self, msg):
        self.stderr.write(self.style.ERROR(msg))

    def print_help(self, *args):
        message = '''
        系统设置命令用法：
            set mfa disable     禁用登录MFA
        '''
        self.stdout.write(message)

    def handle(self, *args, **options):
        target = options['target']
        if target == 'mfa':
            if options['value'] != 'disable':
                return self.echo_error(f'mfa设置，不支持的值【{options["value"]}】')
            AppSetting.set('MFA', {'enable': False})
            self.echo_success('MFA已禁用')
        else:
            self.echo_error('未识别的操作')
            self.print_help()
