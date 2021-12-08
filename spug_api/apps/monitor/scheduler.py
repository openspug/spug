# Copyright: (c) OpenSpug Organization. https://github.com/openspug/spug
# Copyright: (c) <spug.dev@gmail.com>
# Released under the AGPL-3.0 License.
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.executors.pool import ThreadPoolExecutor
from apscheduler.triggers.interval import IntervalTrigger
from django_redis import get_redis_connection
from django.conf import settings
from django.db import connections
from apps.monitor.models import Detection
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

    def _dispatch(self, task_id, tp, targets, extra, threshold, quiet):
        Detection.objects.filter(pk=task_id).update(latest_run_time=human_datetime())
        rds_cli = get_redis_connection()
        for t in json.loads(targets):
            rds_cli.rpush(MONITOR_WORKER_KEY, json.dumps([task_id, tp, t, extra, threshold, quiet]))
        connections.close_all()

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
        connections.close_all()

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
