# Copyright: (c) OpenSpug Organization. https://github.com/openspug/spug
# Copyright: (c) <spug.dev@gmail.com>
# Released under the MIT License.
from django.db import models
from libs import ModelMixin, human_datetime
from apps.account.models import User
import json


class Detection(models.Model, ModelMixin):
    TYPES = (
        ('1', '站点检测'),
        ('2', '端口检测'),
        ('3', '进程检测'),
        ('4', '自定义脚本'),
    )
    STATUS = (
        (0, '成功'),
        (1, '失败'),
    )
    name = models.CharField(max_length=50)
    type = models.CharField(max_length=2, choices=TYPES)
    addr = models.CharField(max_length=255)
    extra = models.TextField(null=True)
    desc = models.CharField(max_length=255, null=True)
    is_active = models.BooleanField(default=True)
    rate = models.IntegerField(default=5)
    threshold = models.IntegerField(default=3)
    quiet = models.IntegerField(default=24 * 60)
    fault_times = models.SmallIntegerField(default=0)
    notify_mode = models.CharField(max_length=255)
    notify_grp = models.CharField(max_length=255)
    latest_status = models.SmallIntegerField(choices=STATUS, null=True)
    latest_run_time = models.CharField(max_length=20, null=True)
    latest_fault_time = models.IntegerField(null=True)
    latest_notify_time = models.IntegerField(default=0)

    created_at = models.CharField(max_length=20, default=human_datetime)
    created_by = models.ForeignKey(User, models.PROTECT, related_name='+')
    updated_at = models.CharField(max_length=20, null=True)
    updated_by = models.ForeignKey(User, models.PROTECT, related_name='+', null=True)

    def to_dict(self, *args, **kwargs):
        tmp = super().to_dict(*args, **kwargs)
        tmp['type_alias'] = self.get_type_display()
        tmp['latest_status_alias'] = self.get_latest_status_display()
        tmp['notify_mode'] = json.loads(self.notify_mode)
        tmp['notify_grp'] = json.loads(self.notify_grp)
        return tmp

    def __repr__(self):
        return '<Detection %r>' % self.name

    class Meta:
        db_table = 'detections'
        ordering = ('-id',)
