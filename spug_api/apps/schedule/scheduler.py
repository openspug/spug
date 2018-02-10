from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.events import EVENT_JOB_REMOVED
from apps.schedule.agent import agent
from apps.schedule.models import Job

from public import config


class Scheduler(object):
    def __init__(self):
        self.cron_job_args = ['year', 'month', 'day', 'week', 'day_of_week', 'hour', 'minute', 'second', 'start_date',
                              'end_date']
        self.scheduler = BackgroundScheduler(timezone=getattr(config, 'TIME_ZONE', 'Asia/Shanghai'))
        self.jobs = {}
        self.already_init = False

    def init(self):
        if not self.already_init:
            for job in Job.query.filter_by(enabled=True).all():
                self.add_job(job)
            self.scheduler.start()
            self.already_init = True

    def __parse_args(self, trigger, trigger_args):
        if trigger == 'cron':
            args = {k: v for k, v in zip(self.cron_job_args, trigger_args.split(';')) if v}
            # 周需要单独处理，0 对应周一，与页面上的说明不一致
            day_of_week = int(args['day_of_week']) if args.get('day_of_week') else None
            if day_of_week == 0:
                args['day_of_week'] = 6
            elif day_of_week is not None:
                args['day_of_week'] = day_of_week - 1
            return args
        elif trigger == 'interval':
            return {'seconds': int(trigger_args)}
        elif trigger == 'date':
            return {'run_date': trigger_args}
        else:
            raise ValueError('未知的调度策略: %r' % trigger)

    def add_job(self, job):
        job_id = str(job.id)
        args = self.__parse_args(job.trigger, job.trigger_args)
        instance = self.scheduler.add_job(
            agent,
            job.trigger,
            id=job_id,
            args=(job.id, job.command_user, job.command, job.targets),
            **args)
        self.jobs[job_id] = instance

    def valid_job_trigger(self, trigger, trigger_args):
        try:
            args = self.__parse_args(trigger, trigger_args)
            job = self.scheduler.add_job(agent, trigger, args=(None, None, None, None), next_run_time=None, **args)
            job.remove()
            return True
        except ValueError:
            return False

    def remove_job(self, job_id):
        job_id = str(job_id)
        if self.scheduler.get_job(job_id):
            self.scheduler.remove_job(job_id)

    def update_job(self, job):
        job_id = str(job.id)
        if self.scheduler.get_job(job_id):
            args = self.__parse_args(job.trigger, job.trigger_args)
            self.scheduler.reschedule_job(job_id, trigger=job.trigger, **args)
        elif job.enabled:
            self.add_job(job)


# 监听任务移除事件
def listener(event):
    if event.code == EVENT_JOB_REMOVED:
        scheduler.jobs.pop(event.job_id, None)


scheduler = Scheduler()
scheduler.scheduler.add_listener(listener, EVENT_JOB_REMOVED)
scheduler.init()
