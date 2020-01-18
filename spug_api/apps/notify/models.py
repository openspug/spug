# Copyright: (c) OpenSpug Organization. https://github.com/openspug/spug
# Copyright: (c) <spug.dev@gmail.com>
# Released under the MIT License.
from django.db import models
from django.core.cache import cache
from libs import ModelMixin, human_datetime
import time


class Notify(models.Model, ModelMixin):
    TYPES = (
        ('1', '通知'),
        ('2', '待办'),
    )
    SOURCES = (
        ('monitor', '监控中心'),
        ('schedule', '任务计划'),
    )
    title = models.CharField(max_length=255)
    source = models.CharField(max_length=10, choices=SOURCES)
    type = models.CharField(max_length=2, choices=TYPES)
    content = models.CharField(max_length=255, null=True)
    unread = models.BooleanField(default=True)
    link = models.CharField(max_length=255, null=True)

    created_at = models.CharField(max_length=20, default=human_datetime)

    @classmethod
    def make_notify(cls, source, type, title, content=None, with_quiet=True):
        if not with_quiet or time.time() - cache.get('spug:notify_quiet', 0) > 3600:
            cache.set('spug:notify_quiet', time.time())
            cls.objects.create(source=source, title=title, type=type, content=content)

    def __repr__(self):
        return '<Notify %r>' % self.title

    class Meta:
        db_table = 'notifies'
        ordering = ('-id',)
