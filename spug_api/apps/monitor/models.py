from django.db import models
from libs import ModelMixin, human_time
from apps.account.models import User


class Detection(models.Model, ModelMixin):
    TYPES = (
        ('1', '站点检测'),
        ('2', '端口检测'),
        ('3', '进程检测'),
        ('4', '自定义脚本'),
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

    created_at = models.CharField(max_length=20, default=human_time)
    created_by = models.ForeignKey(User, models.PROTECT, related_name='+')
    updated_at = models.CharField(max_length=20, null=True)
    updated_by = models.ForeignKey(User, models.PROTECT, related_name='+', null=True)

    def to_dict(self, *args, **kwargs):
        tmp = super().to_dict(*args, **kwargs)
        tmp['type_alias'] = self.get_type_display()
        return tmp

    def __repr__(self):
        return '<Detection %r>' % self.name

    class Meta:
        db_table = 'detections'
        ordering = ('-id',)
