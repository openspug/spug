from django.core.management.base import BaseCommand
from apps.schedule.scheduler import Scheduler


class Command(BaseCommand):
    help = 'Start schedule process'

    def handle(self, *args, **options):
        s = Scheduler()
        s.run()
