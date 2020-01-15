# Copyright: (c) OpenSpug Organization. https://github.com/openspug/spug
# Copyright: (c) <spug.dev@gmail.com>
# Released under the MIT License.
from django.db import models
from libs import ModelMixin, human_datetime
from apps.account.models import User
import json


class Task(models.Model, ModelMixin):
    TRIGGERS = (
        ('date', '一次性'),
        ('calendarinterval', '日历间隔'),
        ('cron', 'UNIX cron'),
        ('interval', '普通间隔')
    )
    STATUS = (
        (0, '成功'),
        (1, '异常'),
        (2, '失败'),
    )
    name = models.CharField(max_length=50)
    type = models.CharField(max_length=50)
    command = models.TextField()
    targets = models.TextField()
    trigger = models.CharField(max_length=20, choices=TRIGGERS)
    trigger_args = models.CharField(max_length=255)
    is_active = models.BooleanField(default=False)
    desc = models.CharField(max_length=255, null=True)
    latest_status = models.SmallIntegerField(choices=STATUS, null=True)
    latest_run_time = models.CharField(max_length=20, null=True)
    latest_output = models.TextField(null=True)

    created_at = models.CharField(max_length=20, default=human_datetime)
    created_by = models.ForeignKey(User, models.PROTECT, related_name='+')
    updated_at = models.CharField(max_length=20, null=True)
    updated_by = models.ForeignKey(User, models.PROTECT, related_name='+', null=True)

    def to_dict(self, *args, **kwargs):
        tmp = super().to_dict(*args, **kwargs)
        tmp['targets'] = json.loads(self.targets)
        tmp['latest_status_alias'] = self.get_latest_status_display()
        return tmp

    def __repr__(self):
        return '<Task %r>' % self.name

    class Meta:
        db_table = 'tasks'
        ordering = ('-id',)
