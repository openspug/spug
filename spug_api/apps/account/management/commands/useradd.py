# Copyright: (c) OpenSpug Organization. https://github.com/openspug/spug
# Copyright: (c) <spug.dev@gmail.com>
# Released under the MIT License.
from django.core.management.base import BaseCommand
from apps.account.models import User


class Command(BaseCommand):
    help = '创建账户'

    def add_arguments(self, parser):
        parser.add_argument('-u', required=True, metavar='username', help='账户名称')
        parser.add_argument('-p', required=True, metavar='password', help='账户密码')
        parser.add_argument('-n', default='', metavar='nickname', help='账户昵称')
        parser.add_argument('-s', default=False, action='store_true', help='是否是超级用户（默认否）')

    def handle(self, *args, **options):
        User.objects.create(
            username=options['u'],
            nickname=options['n'],
            password_hash=User.make_password(options['p']),
            is_supper=options['s'],
        )
        self.stdout.write(self.style.SUCCESS('创建成功'))
