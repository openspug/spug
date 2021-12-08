# Copyright: (c) OpenSpug Organization. https://github.com/openspug/spug
# Copyright: (c) <spug.dev@gmail.com>
# Released under the AGPL-3.0 License.
from django.db import models
from django.core.cache import cache
from libs import ModelMixin, human_datetime
from libs.channel import Channel
import hashlib


class Notify(models.Model, ModelMixin):
    TYPES = (
        ('1', '通知'),
        ('2', '待办'),
    )
    SOURCES = (
        ('monitor', '监控中心'),
        ('schedule', '任务计划'),
        ('flag', '应用发布'),
        ('alert', '系统警告'),
    )
    title = models.CharField(max_length=255)
    source = models.CharField(max_length=10, choices=SOURCES)
    type = models.CharField(max_length=2, choices=TYPES)
    content = models.CharField(max_length=255, null=True)
    unread = models.BooleanField(default=True)
    link = models.CharField(max_length=255, null=True)

    created_at = models.CharField(max_length=20, default=human_datetime)

    @classmethod
    def make_system_notify(cls, title, content):
        cls._make_notify('alert', '1', title, content)

    @classmethod
    def make_monitor_notify(cls, title, content):
        cls._make_notify('monitor', '1', title, content)

    @classmethod
    def make_schedule_notify(cls, title, content):
        cls._make_notify('schedule', '1', title, content)

    @classmethod
    def make_deploy_notify(cls, title, content):
        cls._make_notify('flag', '1', title, content)

    @classmethod
    def _make_notify(cls, source, type, title, content):
        tmp_str = f'{source},{type},{title},{content}'
        digest = hashlib.md5(tmp_str.encode()).hexdigest()
        unique_key = f'spug:notify:{digest}'
        if not cache.get(unique_key):   # 限制相同内容的发送频率
            cache.set(unique_key, 1, 3600)
            cls.objects.create(source=source, title=title, type=type, content=content)
        Channel.send_notify(title, content)

    def __repr__(self):
        return '<Notify %r>' % self.title

    class Meta:
        db_table = 'notifies'
        ordering = ('-id',)
