# Copyright: (c) OpenSpug Organization. https://github.com/openspug/spug
# Copyright: (c) <spug.dev@gmail.com>
# Released under the AGPL-3.0 License.
from django.db import models
from django.db.models import Max
from django.conf import settings
from django.utils import timezone
from libs.mixins import ModelMixin
from libs.utils import human_seconds_time
from apps.account.models import User
from pathlib import Path
import json


class Pipeline(models.Model, ModelMixin):
    name = models.CharField(max_length=64)
    nodes = models.TextField(default='[]')
    created_by = models.ForeignKey(User, on_delete=models.PROTECT)
    created_at = models.DateTimeField(auto_now_add=True)

    def to_view(self):
        tmp = self.to_dict()
        tmp['nodes'] = json.loads(self.nodes)
        return tmp

    def to_list(self, latest=None):
        tmp = self.to_dict(selects=('id', 'name', 'created_at'))
        # 最近一次执行由调用方批量查出后传入，避免列表页 N+1
        tmp['latest_id'] = latest.id if latest else None
        tmp['latest_status'] = latest.status if latest else None
        tmp['latest_status_alias'] = latest.get_status_display() if latest else None
        tmp['latest_at'] = latest.created_at if latest else None
        return tmp

    def delete(self, using=None, keep_parents=False):
        # 数据库级联不会调用 PipeHistory.delete()，控制台输出文件会成为孤儿，这里逐条删
        for item in self.pipehistory_set.all():
            item.delete()
        super().delete(using, keep_parents)

    class Meta:
        db_table = 'pipelines'
        ordering = ('-id',)


class PipeHistory(models.Model, ModelMixin):
    STATUS = (
        (0, '执行中'),
        (1, '成功'),
        (2, '失败'),
        (3, '已中断'),
    )
    TRIGGERS = (
        ('web', '页面执行'),
        ('api', '开放API'),
    )
    # 每条流水线保留的执行记录数，超出的连同控制台输出文件一并清理
    KEEP_NUM = 50

    pipeline = models.ForeignKey(Pipeline, on_delete=models.CASCADE)
    ordinal = models.IntegerField()
    token = models.CharField(max_length=32, null=True, db_index=True)
    status = models.SmallIntegerField(choices=STATUS, default=0)
    trigger = models.CharField(max_length=10, choices=TRIGGERS, default='web')
    # 本次执行的节点快照，流水线后续被编辑后历史控制台仍要能还原当时的节点图
    nodes = models.TextField(default='[]')
    created_by = models.ForeignKey(User, on_delete=models.PROTECT)
    created_at = models.DateTimeField(auto_now_add=True)
    finished_at = models.DateTimeField(null=True)

    @property
    def output_key(self):
        """控制台输出的定位键：redis 用它做 list 键，落盘文件名是 {output_key}:{节点键}"""
        return self.token

    @property
    def duration(self):
        if not self.finished_at:
            return None
        seconds = (self.finished_at - self.created_at).total_seconds()
        # 取整到秒，否则毫秒级的执行会显示成 0.0秒
        return '不足1秒' if seconds < 1 else human_seconds_time(int(seconds))

    def to_list(self):
        tmp = self.to_dict(selects=('id', 'ordinal', 'status', 'trigger', 'created_at', 'finished_at'))
        tmp['status_alias'] = self.get_status_display()
        tmp['trigger_alias'] = self.get_trigger_display()
        tmp['created_by'] = self.created_by.nickname
        # 用 _alias 结尾，英文模式下中间件才会把中文时长转成 1m 20s
        tmp['duration_alias'] = self.duration
        return tmp

    @classmethod
    def finish(cls, history_id, is_success):
        # 只收口仍处于执行中的记录，避免中断补偿和正常收尾互相覆盖
        return cls.objects.filter(pk=history_id, status=0).update(
            status=1 if is_success else 2, finished_at=timezone.now())

    @classmethod
    def make(cls, pipe, nodes, user, token, trigger='web'):
        latest = pipe.pipehistory_set.first()
        ordinal = latest.ordinal + 1 if latest else 1
        record = cls.objects.create(
            pipeline=pipe,
            ordinal=ordinal,
            token=token,
            trigger=trigger,
            nodes=json.dumps(nodes),
            created_by=user)
        cls.prune(pipe)
        return record

    @classmethod
    def prune(cls, pipe):
        # 逐条删除而不是 queryset.delete()，后者不会触发下面的 delete() 清理输出文件
        expires = cls.objects.filter(pipeline=pipe).values_list('id', flat=True)[cls.KEEP_NUM:]
        for item in cls.objects.filter(id__in=list(expires)):
            item.delete()

    @classmethod
    def latest_map(cls, pipe_ids):
        """批量取每条流水线的最近一次执行记录"""
        if not pipe_ids:
            return {}
        # order_by() 必须清空模型默认排序，否则 id 会混进 GROUP BY 导致每条记录各成一组
        ids = cls.objects.filter(pipeline_id__in=pipe_ids) \
            .values('pipeline_id').order_by().annotate(m=Max('id')).values_list('m', flat=True)
        return {x.pipeline_id: x for x in cls.objects.filter(id__in=list(ids))}

    def delete(self, using=None, keep_parents=False):
        if self.token:
            for p in Path(settings.DEPLOY_DIR).glob(f'{self.token}:*'):
                try:
                    p.unlink()
                except FileNotFoundError:
                    pass
        super().delete(using, keep_parents)

    class Meta:
        db_table = 'pipeline_histories'
        ordering = ('-id',)
