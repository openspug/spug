# Copyright: (c) OpenSpug Organization. https://github.com/openspug/spug
# Copyright: (c) <spug.dev@gmail.com>
# Released under the MIT License.
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.interval import IntervalTrigger
from apscheduler.events import EVENT_SCHEDULER_SHUTDOWN, EVENT_JOB_MAX_INSTANCES, EVENT_JOB_ERROR, EVENT_JOB_EXECUTED
from django_redis import get_redis_connection
from django.utils.functional import SimpleLazyObject
from django.db import close_old_connections
from apps.monitor.models import Detection
from apps.alarm.models import Alarm
from apps.monitor.executors import dispatch
from apps.monitor.utils import seconds_to_human
from apps.notify.models import Notify
from django.conf import settings
from libs import spug, AttrDict, human_datetime
import logging
import json
import time

logger = logging.getLogger("django.apps.monitor")


class Scheduler:
    timezone = settings.TIME_ZONE

    def __init__(self):
        self.scheduler = BackgroundScheduler(timezone=self.timezone)
        self.scheduler.add_listener(
            self._handle_event,
            EVENT_SCHEDULER_SHUTDOWN | EVENT_JOB_ERROR | EVENT_JOB_MAX_INSTANCES | EVENT_JOB_EXECUTED)

    def _record_alarm(self, obj, status):
        duration = seconds_to_human(time.time() - obj.latest_fault_time)
        Alarm.objects.create(
            name=obj.name,
            type=obj.get_type_display(),
            status=status,
            duration=duration,
            notify_grp=obj.notify_grp,
            notify_mode=obj.notify_mode)

    def _do_notify(self, event, obj):
        grp = json.loads(obj.notify_grp)
        for mode in json.loads(obj.notify_mode):
            if mode == '1':
                spug.notify_by_wx(event, obj.name, grp)
            elif mode == '3':
                spug.notify_by_dd(event, obj.name, grp)
            elif mode == '4':
                spug.notify_by_email(event, obj.name, grp)

    def _handle_notify(self, obj, old_status):
        if obj.latest_status == 0:
            if old_status == 1:
                self._record_alarm(obj, '2')
                logger.info(f'{human_datetime()} recover job_id: {obj.id}')
                self._do_notify('2', obj)
        else:
            if obj.fault_times >= obj.threshold:
                if time.time() - obj.latest_notify_time >= obj.quiet * 60:
                    obj.latest_notify_time = int(time.time())
                    obj.save()
                    self._record_alarm(obj, '1')
                    logger.info(f'{human_datetime()} notify job_id: {obj.id}')
                    self._do_notify('1', obj)

    def _handle_event(self, event):
        close_old_connections()
        obj = SimpleLazyObject(lambda: Detection.objects.filter(pk=event.job_id).first())
        if event.code == EVENT_SCHEDULER_SHUTDOWN:
            logger.info(f'EVENT_SCHEDULER_SHUTDOWN: {event}')
            Notify.make_notify('monitor', '1', '调度器已关闭', '调度器意外关闭，你可以在github上提交issue', False)
        elif event.code == EVENT_JOB_MAX_INSTANCES:
            logger.info(f'EVENT_JOB_MAX_INSTANCES: {event}')
            Notify.make_notify('monitor', '1', f'{obj.name} - 达到调度实例上限', '一般为上个周期的执行任务还未结束，请增加调度间隔或减少任务执行耗时')
        elif event.code == EVENT_JOB_ERROR:
            logger.info(f'EVENT_JOB_ERROR: job_id {event.job_id} exception: {event.exception}')
            Notify.make_notify('monitor', '1', f'{obj.name} - 执行异常', f'{event.exception}')
        elif event.code == EVENT_JOB_EXECUTED:
            obj = Detection.objects.filter(pk=event.job_id).first()
            old_status = obj.latest_status
            obj.latest_status = 0 if event.retval else 1
            obj.latest_run_time = human_datetime(event.scheduled_run_time)
            if old_status in [0, None] and event.retval is False:
                obj.latest_fault_time = int(time.time())
            if obj.latest_status == 0:
                obj.latest_notify_time = 0
                obj.fault_times = 0
            else:
                obj.fault_times += 1
            obj.save()
            self._handle_notify(obj, old_status)

    def _init(self):
        self.scheduler.start()
        for item in Detection.objects.filter(is_active=True):
            trigger = IntervalTrigger(minutes=int(item.rate), timezone=self.timezone)
            self.scheduler.add_job(
                dispatch,
                trigger,
                id=str(item.id),
                args=(item.type, item.addr, item.extra),
            )

    def run(self):
        rds_cli = get_redis_connection()
        self._init()
        rds_cli.delete(settings.MONITOR_KEY)
        logger.info('Running monitor')
        while True:
            _, data = rds_cli.blpop(settings.MONITOR_KEY)
            task = AttrDict(json.loads(data))
            if task.action in ('add', 'modify'):
                trigger = IntervalTrigger(minutes=int(task.rate), timezone=self.timezone)
                self.scheduler.add_job(
                    dispatch,
                    trigger,
                    id=str(task.id),
                    args=(task.type, task.addr, task.extra),
                    replace_existing=True
                )
            elif task.action == 'remove':
                job = self.scheduler.get_job(str(task.id))
                if job:
                    job.remove()
