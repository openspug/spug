from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.interval import IntervalTrigger
from apscheduler.triggers.date import DateTrigger
from apscheduler import events
from django_redis import get_redis_connection
from apps.schedule.models import Task
from apps.schedule.executors import dispatch
from django.conf import settings
from libs import AttrDict, human_time
import logging
import json

logger = logging.getLogger("django.apps.scheduler")


class Scheduler:
    timezone = settings.TIME_ZONE

    def __init__(self):
        self.scheduler = BackgroundScheduler(timezone=self.timezone)
        self.scheduler.add_listener(self._handle_event, )

    @classmethod
    def parse_trigger(cls, trigger, trigger_args):
        if trigger == 'interval':
            return IntervalTrigger(seconds=int(trigger_args), timezone=cls.timezone)
        elif trigger == 'date':
            return DateTrigger(run_date=trigger_args, timezone=cls.timezone)
        else:
            raise TypeError(f'unknown schedule policy: {trigger!r}')

    def _handle_event(self, event):
        # TODO: notify to user
        if event.code == events.EVENT_SCHEDULER_SHUTDOWN:
            logger.info(f'EVENT_SCHEDULER_SHUTDOWN: {event}')
        if event.code == events.EVENT_JOB_MAX_INSTANCES:
            logger.info(f'EVENT_JOB_MAX_INSTANCES: {event}')
        if event.code == events.EVENT_JOB_ERROR:
            logger.info(f'EVENT_JOB_ERROR: job_id {event.job_id} exception: {event.exception}')
        if event.code == events.EVENT_JOB_MISSED:
            logger.info(f'EVENT_JOB_MISSED: job_id {event.job_id}')
        if event.code == events.EVENT_JOB_EXECUTED:
            score = 0
            for item in event.retval:
                score += 1 if item[1] else 0
            Task.objects.filter(pk=event.job_id).update(
                latest_status=2 if score == len(event.retval) else 1 if score else 0,
                latest_run_time=human_time(event.scheduled_run_time),
                latest_output=json.dumps(event.retval)
            )

    def _init(self):
        self.scheduler.start()
        for task in Task.objects.filter(is_active=True):
            trigger = self.parse_trigger(task.trigger, task.trigger_args)
            self.scheduler.add_job(
                dispatch,
                trigger,
                id=str(task.id),
                args=(task.command, json.loads(task.targets)),
            )

    def run(self):
        rds_cli = get_redis_connection()
        self._init()
        rds_cli.delete(settings.SCHEDULE_KEY)
        logger.info('Running scheduler')
        while True:
            _, data = rds_cli.blpop(settings.SCHEDULE_KEY)
            task = AttrDict(json.loads(data))
            if task.action in ('add', 'modify'):
                trigger = self.parse_trigger(task.trigger, task.trigger_args)
                self.scheduler.add_job(
                    dispatch,
                    trigger,
                    id=str(task.id),
                    args=(task.command, task.targets),
                    replace_existing=True
                )
            elif task.action == 'remove':
                job = self.scheduler.get_job(str(task.id))
                if job:
                    job.remove()
