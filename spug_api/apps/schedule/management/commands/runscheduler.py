# Copyright: (c) OpenSpug Organization. https://github.com/openspug/spug
# Copyright: (c) <spug.dev@gmail.com>
# Released under the AGPL-3.0 License.
from django.core.management.base import BaseCommand
from apps.schedule.scheduler import Scheduler


class Command(BaseCommand):
    help = 'Start schedule process'

    def handle(self, *args, **options):
        s = Scheduler()
        s.run()
