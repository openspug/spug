# Copyright: (c) OpenSpug Organization. https://github.com/openspug/spug
# Copyright: (c) <spug.dev@gmail.com>
# Released under the AGPL-3.0 License.
from django.db import models
from libs import ModelMixin, human_datetime
from apps.account.models import User
import json


class History(models.Model, ModelMixin):
    STATUS = (
        (0, '执行中'),
        (1, '成功'),
        (2, '失败'),
    )
    task_id = models.IntegerField()
    status = models.SmallIntegerField(choices=STATUS)
    run_time = models.CharField(max_length=20)
    output = models.TextField()

    def to_list(self):
        tmp = super().to_dict(selects=('id', 'status', 'run_time'))
        tmp['status_alias'] = self.get_status_display()
        return tmp

    class Meta:
        db_table = 'task_histories'
        ordering = ('-id',)


class Task(models.Model, ModelMixin):
    TRIGGERS = (
        ('date', '一次性'),
        ('calendarinterval', '日历间隔'),
        ('cron', 'UNIX cron'),
        ('interval', '普通间隔')
    )
    name = models.CharField(max_length=50)
    type = models.CharField(max_length=50)
    command = models.TextField()
    targets = models.TextField()
    trigger = models.CharField(max_length=20, choices=TRIGGERS)
    trigger_args = models.CharField(max_length=255)
    is_active = models.BooleanField(default=False)
    desc = models.CharField(max_length=255, null=True)
    latest = models.ForeignKey(History, on_delete=models.PROTECT, null=True)
    rst_notify = models.CharField(max_length=255, null=True)

    created_at = models.CharField(max_length=20, default=human_datetime)
    created_by = models.ForeignKey(User, models.PROTECT, related_name='+')
    updated_at = models.CharField(max_length=20, null=True)
    updated_by = models.ForeignKey(User, models.PROTECT, related_name='+', null=True)

    def to_dict(self, *args, **kwargs):
        tmp = super().to_dict(*args, **kwargs)
        tmp['targets'] = json.loads(self.targets)
        tmp['latest_status'] = self.latest.status if self.latest else None
        tmp['latest_run_time'] = self.latest.run_time if self.latest else None
        tmp['latest_status_alias'] = self.latest.get_status_display() if self.latest else None
        tmp['rst_notify'] = json.loads(self.rst_notify) if self.rst_notify else {'mode': '0'}
        if self.trigger == 'cron':
            tmp['trigger_args'] = json.loads(self.trigger_args)
        return tmp

    def __repr__(self):
        return '<Task %r>' % self.name

    class Meta:
        db_table = 'tasks'
        ordering = ('-id',)
