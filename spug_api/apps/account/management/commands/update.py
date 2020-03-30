# Copyright: (c) OpenSpug Organization. https://github.com/openspug/spug
# Copyright: (c) <spug.dev@gmail.com>
# Released under the MIT License.
from django.core.management.base import BaseCommand
from django.core.management import execute_from_command_line
from django.conf import settings


class Command(BaseCommand):
    help = '升级Spug版本'

    def add_arguments(self, parser):
        parser.add_argument('version', help='要升级的版本')

    def handle(self, *args, **options):

        self.stdout.write(self.style.SUCCESS('升级成功'))
