from django.db import models
from libs import ModelMixin, human_time
from apps.account.models import User
from apps.app.models import App


class DeployRequest(models.Model, ModelMixin):
    STATUS = (
        ('-2', '发布失败'),
        ('-1', '已驳回'),
        ('1', '待审核'),
        ('2', '待发布'),
        ('3', '已完成'),
    )
    app = models.ForeignKey(App, on_delete=models.CASCADE)
    name = models.CharField(max_length=50)
    extra = models.TextField()
    host_ids = models.TextField()
    desc = models.CharField(max_length=255, null=True)
    status = models.CharField(max_length=2, choices=STATUS)
    reason = models.CharField(max_length=255, null=True)

    created_at = models.CharField(max_length=20, default=human_time)
    created_by = models.ForeignKey(User, models.PROTECT, related_name='+')
    approve_at = models.CharField(max_length=20, null=True)
    approve_by = models.ForeignKey(User, models.PROTECT, related_name='+', null=True)

    def __repr__(self):
        return f'<DeployRequest app_id={self.app_id} name={self.name}>'

    class Meta:
        db_table = 'deploy_requests'
        ordering = ('-id',)
