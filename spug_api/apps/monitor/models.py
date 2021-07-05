# Copyright: (c) OpenSpug Organization. https://github.com/openspug/spug
# Copyright: (c) <spug.dev@gmail.com>
# Released under the AGPL-3.0 License.
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
        ('5', 'Ping检测'),
    )
    STATUS = (
        (0, '正常'),
        (1, '异常'),
    )
    name = models.CharField(max_length=50)
    type = models.CharField(max_length=2, choices=TYPES)
    group = models.CharField(max_length=255, null=True)
    targets = models.TextField()
    extra = models.TextField(null=True)
    desc = models.CharField(max_length=255, null=True)
    is_active = models.BooleanField(default=True)
    rate = models.IntegerField(default=5)
    threshold = models.IntegerField(default=3)
    quiet = models.IntegerField(default=24 * 60)
    fault_times = models.SmallIntegerField(default=0)
    notify_mode = models.CharField(max_length=255)
    notify_grp = models.CharField(max_length=255)
    latest_run_time = models.CharField(max_length=20, null=True)

    created_at = models.CharField(max_length=20, default=human_datetime)
    created_by = models.ForeignKey(User, models.PROTECT, related_name='+')
    updated_at = models.CharField(max_length=20, null=True)
    updated_by = models.ForeignKey(User, models.PROTECT, related_name='+', null=True)

    def to_view(self):
        tmp = self.to_dict()
        tmp['type_alias'] = self.get_type_display()
        tmp['notify_mode'] = json.loads(self.notify_mode)
        tmp['notify_grp'] = json.loads(self.notify_grp)
        tmp['targets'] = json.loads(self.targets)
        return tmp

    def __repr__(self):
        return '<Detection %r>' % self.name

    class Meta:
        db_table = 'detections'
        ordering = ('-id',)
