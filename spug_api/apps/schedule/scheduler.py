# Copyright: (c) OpenSpug Organization. https://github.com/openspug/spug
# Copyright: (c) <spug.dev@gmail.com>
# Released under the AGPL-3.0 License.
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.executors.pool import ThreadPoolExecutor
from apscheduler.triggers.interval import IntervalTrigger
from apscheduler.triggers.date import DateTrigger
from apscheduler.triggers.cron import CronTrigger
from django_redis import get_redis_connection
from django.db import connections
from apps.schedule.models import Task, History
from apps.schedule.builtin import auto_run_by_day, auto_run_by_minute
from django.conf import settings
from libs import AttrDict, human_datetime
import logging
import json

SCHEDULE_WORKER_KEY = settings.SCHEDULE_WORKER_KEY


class Scheduler:
    timezone = settings.TIME_ZONE
    week_map = {
        '/': '/',
        '-': '-',
        '*': '*',
        '7': '6',
        '0': '6',
        '1': '0',
        '2': '1',
        '3': '2',
        '4': '3',
        '5': '4',
        '6': '5',
    }

    def __init__(self):
        self.scheduler = BackgroundScheduler(timezone=self.timezone, executors={'default': ThreadPoolExecutor(30)})

    @classmethod
    def covert_week(cls, week_str):
        return ''.join(map(lambda x: cls.week_map[x], week_str))

    @classmethod
    def parse_trigger(cls, trigger, trigger_args):
        if trigger == 'interval':
            return IntervalTrigger(seconds=int(trigger_args), timezone=cls.timezone)
        elif trigger == 'date':
            return DateTrigger(run_date=trigger_args, timezone=cls.timezone)
        elif trigger == 'cron':
            args = json.loads(trigger_args) if not isinstance(trigger_args, dict) else trigger_args
            minute, hour, day, month, week = args['rule'].split()
            week = cls.covert_week(week)
            return CronTrigger(minute=minute, hour=hour, day=day, month=month, day_of_week=week,
                               start_date=args['start'], end_date=args['stop'])
        else:
            raise TypeError(f'unknown schedule policy: {trigger!r}')

    def _init_builtin_jobs(self):
        self.scheduler.add_job(auto_run_by_day, 'cron', hour=1, minute=20)
        self.scheduler.add_job(auto_run_by_minute, 'interval', minutes=1)

    def _dispatch(self, task_id, command, targets):
        output = {x: None for x in targets}
        history = History.objects.create(
            task_id=task_id,
            status='0',
            run_time=human_datetime(),
            output=json.dumps(output)
        )
        Task.objects.filter(pk=task_id).update(latest_id=history.id)
        rds_cli = get_redis_connection()
        for t in targets:
            rds_cli.rpush(SCHEDULE_WORKER_KEY, json.dumps([history.id, t, command]))
        connections.close_all()

    def _init(self):
        self.scheduler.start()
        self._init_builtin_jobs()
        for task in Task.objects.filter(is_active=True):
            trigger = self.parse_trigger(task.trigger, task.trigger_args)
            self.scheduler.add_job(
                self._dispatch,
                trigger,
                id=str(task.id),
                args=(task.id, task.command, json.loads(task.targets)),
            )
        connections.close_all()

    def run(self):
        rds_cli = get_redis_connection()
        self._init()
        rds_cli.delete(settings.SCHEDULE_KEY)
        logging.warning('Running scheduler')
        while True:
            _, data = rds_cli.brpop(settings.SCHEDULE_KEY)
            task = AttrDict(json.loads(data))
            if task.action in ('add', 'modify'):
                trigger = self.parse_trigger(task.trigger, task.trigger_args)
                self.scheduler.add_job(
                    self._dispatch,
                    trigger,
                    id=str(task.id),
                    args=(task.id, task.command, task.targets),
                    replace_existing=True
                )
            elif task.action == 'remove':
                job = self.scheduler.get_job(str(task.id))
                if job:
                    job.remove()
