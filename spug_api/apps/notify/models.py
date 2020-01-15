from django.db import models
from libs import ModelMixin, human_datetime


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

    def __repr__(self):
        return '<Notify %r>' % self.title

    class Meta:
        db_table = 'notifies'
        ordering = ('-id',)
