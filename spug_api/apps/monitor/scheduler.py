# Copyright: (c) OpenSpug Organization. https://github.com/openspug/spug
# Copyright: (c) <spug.dev@gmail.com>
# Released under the AGPL-3.0 License.
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.executors.pool import ThreadPoolExecutor
from apscheduler.triggers.interval import IntervalTrigger
from apscheduler.events import EVENT_SCHEDULER_SHUTDOWN, EVENT_JOB_MAX_INSTANCES, EVENT_JOB_ERROR, EVENT_JOB_EXECUTED
from django_redis import get_redis_connection
from django.utils.functional import SimpleLazyObject
from django.db import connections
from apps.monitor.models import Detection
from apps.notify.models import Notify
from django.conf import settings
from libs import AttrDict, human_datetime
from datetime import datetime, timedelta
from random import randint
import logging
import json

MONITOR_WORKER_KEY = settings.MONITOR_WORKER_KEY


class Scheduler:
    timezone = settings.TIME_ZONE

    def __init__(self):
        self.scheduler = BackgroundScheduler(timezone=self.timezone, executors={'default': ThreadPoolExecutor(30)})
        self.scheduler.add_listener(
            self._handle_event,
            EVENT_SCHEDULER_SHUTDOWN | EVENT_JOB_ERROR | EVENT_JOB_MAX_INSTANCES | EVENT_JOB_EXECUTED
        )

    def _handle_event(self, event):
        obj = SimpleLazyObject(lambda: Detection.objects.filter(pk=event.job_id).first())
        if event.code == EVENT_SCHEDULER_SHUTDOWN:
            logging.warning(f'EVENT_SCHEDULER_SHUTDOWN: {event}')
            Notify.make_notify('monitor', '1', '调度器已关闭', '调度器意外关闭，你可以在github上提交issue', False)
        elif event.code == EVENT_JOB_MAX_INSTANCES:
            logging.warning(f'EVENT_JOB_MAX_INSTANCES: {event}')
            Notify.make_notify('monitor', '1', f'{obj.name} - 达到调度实例上限', '一般为上个周期的执行任务还未结束，请增加调度间隔或减少任务执行耗时')
        elif event.code == EVENT_JOB_ERROR:
            logging.warning(f'EVENT_JOB_ERROR: job_id {event.job_id} exception: {event.exception}')
            Notify.make_notify('monitor', '1', f'{obj.name} - 执行异常', f'{event.exception}')
        connections.close_all()

    def _dispatch(self, task_id, tp, targets, extra, threshold, quiet):
        Detection.objects.filter(pk=task_id).update(latest_run_time=human_datetime())
        rds_cli = get_redis_connection()
        for t in json.loads(targets):
            rds_cli.rpush(MONITOR_WORKER_KEY, json.dumps([task_id, tp, t, extra, threshold, quiet]))

    def _init(self):
        self.scheduler.start()
        for item in Detection.objects.filter(is_active=True):
            now = datetime.now()
            trigger = IntervalTrigger(minutes=int(item.rate), timezone=self.timezone)
            self.scheduler.add_job(
                self._dispatch,
                trigger,
                id=str(item.id),
                args=(item.id, item.type, item.targets, item.extra, item.threshold, item.quiet),
                next_run_time=now + timedelta(seconds=randint(0, 60))
            )

    def run(self):
        rds_cli = get_redis_connection()
        self._init()
        rds_cli.delete(settings.MONITOR_KEY)
        logging.warning('Running monitor')
        while True:
            _, data = rds_cli.brpop(settings.MONITOR_KEY)
            task = AttrDict(json.loads(data))
            if task.action in ('add', 'modify'):
                trigger = IntervalTrigger(minutes=int(task.rate), timezone=self.timezone)
                self.scheduler.add_job(
                    self._dispatch,
                    trigger,
                    id=str(task.id),
                    args=(task.id, task.type, task.targets, task.extra, task.threshold, task.quiet),
                    replace_existing=True
                )
            elif task.action == 'remove':
                job = self.scheduler.get_job(str(task.id))
                if job:
                    job.remove()
