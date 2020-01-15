# Copyright: (c) OpenSpug Organization. https://github.com/openspug/spug
# Copyright: (c) <spug.dev@gmail.com>
# Released under the MIT License.
from django.db import models
from libs import ModelMixin, human_datetime
from apps.account.models import User
import json


class Alarm(models.Model, ModelMixin):
    MODES = (
        ('1', '微信'),
        ('2', '短信'),
        ('3', '钉钉'),
        ('4', '邮件'),
    )
    STATUS = (
        ('1', '报警发生'),
        ('2', '故障恢复'),
    )
    name = models.CharField(max_length=50)
    type = models.CharField(max_length=50)
    notify_mode = models.CharField(max_length=255)
    notify_grp = models.CharField(max_length=255)
    status = models.CharField(max_length=2, choices=STATUS)
    duration = models.CharField(max_length=50)
    created_at = models.CharField(max_length=20, default=human_datetime)

    def to_dict(self, *args, **kwargs):
        tmp = super().to_dict(*args, **kwargs)
        tmp['notify_mode'] = ','.join(dict(self.MODES)[x] for x in json.loads(self.notify_mode))
        tmp['notify_grp'] = json.loads(self.notify_grp)
        tmp['status_alias'] = self.get_status_display()
        return tmp

    def __repr__(self):
        return '<Alarm %r>' % self.name

    class Meta:
        db_table = 'alarms'
        ordering = ('-id',)


class Group(models.Model, ModelMixin):
    name = models.CharField(max_length=50)
    desc = models.CharField(max_length=255, null=True)
    contacts = models.TextField(null=True)
    created_at = models.CharField(max_length=20, default=human_datetime)
    created_by = models.ForeignKey(User, models.PROTECT, related_name='+')

    def to_dict(self, *args, **kwargs):
        tmp = super().to_dict(*args, **kwargs)
        tmp['contacts'] = json.loads(self.contacts)
        return tmp

    def __repr__(self):
        return '<AlarmGroup %r>' % self.name

    class Meta:
        db_table = 'alarm_groups'
        ordering = ('-id',)


class Contact(models.Model, ModelMixin):
    name = models.CharField(max_length=50)
    phone = models.CharField(max_length=20, null=True)
    email = models.CharField(max_length=255, null=True)
    ding = models.CharField(max_length=255, null=True)
    wx_token = models.CharField(max_length=255, null=True)

    created_at = models.CharField(max_length=20, default=human_datetime)
    created_by = models.ForeignKey(User, models.PROTECT, related_name='+')

    def __repr__(self):
        return '<AlarmContact %r>' % self.name

    class Meta:
        db_table = 'alarm_contacts'
        ordering = ('-id',)
