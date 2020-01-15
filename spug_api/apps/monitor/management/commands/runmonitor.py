# Copyright: (c) OpenSpug Organization. https://github.com/openspug/spug
# Copyright: (c) <spug.dev@gmail.com>
# Released under the MIT License.
from django.core.management.base import BaseCommand
from apps.monitor.scheduler import Scheduler


class Command(BaseCommand):
    help = 'Start monitor process'

    def handle(self, *args, **options):
        s = Scheduler()
        s.run()
