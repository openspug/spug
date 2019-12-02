from django.core.management.base import BaseCommand
from apps.monitor.scheduler import Scheduler


class Command(BaseCommand):
    help = 'Start monitor process'

    def handle(self, *args, **options):
        s = Scheduler()
        s.run()
