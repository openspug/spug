# Copyright: (c) OpenSpug Organization. https://github.com/openspug/spug
# Copyright: (c) <spug.dev@gmail.com>
# Released under the MIT License.
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.interval import IntervalTrigger
from apscheduler.triggers.date import DateTrigger
from apscheduler.events import EVENT_SCHEDULER_SHUTDOWN, EVENT_JOB_MAX_INSTANCES, EVENT_JOB_ERROR, EVENT_JOB_EXECUTED
from django_redis import get_redis_connection
from django.utils.functional import SimpleLazyObject
from django.db import close_old_connections
from apps.schedule.models import Task
from apps.notify.models import Notify
from apps.schedule.executors import dispatch
from apps.alarm.utils import auto_clean_records
from django.conf import settings
from libs import AttrDict, human_datetime
import logging
import json
import time

logger = logging.getLogger("django.apps.scheduler")
counter = dict()


class Scheduler:
    timezone = settings.TIME_ZONE

    def __init__(self):
        self.scheduler = BackgroundScheduler(timezone=self.timezone)
        self.scheduler.add_listener(
            self._handle_event,
            EVENT_SCHEDULER_SHUTDOWN | EVENT_JOB_ERROR | EVENT_JOB_MAX_INSTANCES | EVENT_JOB_EXECUTED)

    @classmethod
    def parse_trigger(cls, trigger, trigger_args):
        if trigger == 'interval':
            return IntervalTrigger(seconds=int(trigger_args), timezone=cls.timezone)
        elif trigger == 'date':
            return DateTrigger(run_date=trigger_args, timezone=cls.timezone)
        else:
            raise TypeError(f'unknown schedule policy: {trigger!r}')

    def _handle_event(self, event):
        close_old_connections()
        obj = SimpleLazyObject(lambda: Task.objects.filter(pk=event.job_id).first())
        if event.code == EVENT_SCHEDULER_SHUTDOWN:
            logger.info(f'EVENT_SCHEDULER_SHUTDOWN: {event}')
            Notify.make_notify('schedule', '1', '调度器已关闭', '调度器意外关闭，你可以在github上提交issue')
        elif event.code == EVENT_JOB_MAX_INSTANCES:
            logger.info(f'EVENT_JOB_MAX_INSTANCES: {event}')
            Notify.make_notify('schedule', '1', f'{obj.name} - 达到调度实例上限', '一般为上个周期的执行任务还未结束，请增加调度间隔或减少任务执行耗时')
        elif event.code == EVENT_JOB_ERROR:
            logger.info(f'EVENT_JOB_ERROR: job_id {event.job_id} exception: {event.exception}')
            Notify.make_notify('schedule', '1', f'{obj.name} - 执行异常', f'{event.exception}')
        elif event.code == EVENT_JOB_EXECUTED:
            if event.retval:
                score = 0
                for item in event.retval:
                    score += 1 if item[1] else 0
                Task.objects.filter(pk=event.job_id).update(
                    latest_status=2 if score == len(event.retval) else 1 if score else 0,
                    latest_run_time=human_datetime(event.scheduled_run_time),
                    latest_output=json.dumps(event.retval)
                )
                if score != 0 and time.time() - counter.get(event.job_id, 0) > 3600:
                    counter[event.job_id] = time.time()
                    Notify.make_notify('schedule', '1', f'{obj.name} - 执行失败', '请在任务计划中查看失败详情')

    def _init_builtin_jobs(self):
        self.scheduler.add_job(auto_clean_records, 'cron', hour=0, minute=0)

    def _init(self):
        self.scheduler.start()
        self._init_builtin_jobs()
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
