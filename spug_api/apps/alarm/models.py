# Copyright: (c) OpenSpug Organization. https://github.com/openspug/spug
# Copyright: (c) <spug.dev@gmail.com>
# Released under the AGPL-3.0 License.
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
        ('5', '企业微信'),
        ('7', '飞书'),
    )
    STATUS = (
        ('1', '报警发生'),
        ('2', '故障恢复'),
    )
    name = models.CharField(max_length=50)
    type = models.CharField(max_length=50)
    target = models.CharField(max_length=100)
    notify_mode = models.CharField(max_length=255)
    notify_grp = models.CharField(max_length=255)
    status = models.CharField(max_length=2, choices=STATUS)
    duration = models.CharField(max_length=50)
    created_at = models.CharField(max_length=20, default=human_datetime)

    def to_dict(self, *args, **kwargs):
        tmp = super().to_dict(*args, **kwargs)
        modes = dict(self.MODES)
        # *_alias 字段会被 TranslateMiddleware 按请求语言翻译，
        # type/duration 在建记录时就落库为中文展示值，故一并以 alias 形式输出
        tmp['notify_mode_alias'] = [modes[x] for x in json.loads(self.notify_mode)]
        tmp['notify_mode'] = ','.join(tmp['notify_mode_alias'])
        tmp['notify_grp'] = json.loads(self.notify_grp)
        tmp['status_alias'] = self.get_status_display()
        tmp['type_alias'] = self.type
        tmp['duration_alias'] = self.duration
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
    qy_wx = models.CharField(max_length=255, null=True)
    feishu = models.CharField(max_length=255, null=True)
    # 各渠道的加签密钥，JSON 存放，形如 {"ding": "...", "feishu": "..."}。
    # 合并成一个字段是为了后续新增渠道不必再改表结构。
    secret = models.TextField(null=True)

    created_at = models.CharField(max_length=20, default=human_datetime)
    created_by = models.ForeignKey(User, models.PROTECT, related_name='+')

    def __repr__(self):
        return '<AlarmContact %r>' % self.name

    class Meta:
        db_table = 'alarm_contacts'
        ordering = ('-id',)
