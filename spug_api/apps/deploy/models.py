from django.db import models
from libs import ModelMixin, human_time
from apps.account.models import User
from apps.app.models import App


class DeployRequest(models.Model, ModelMixin):
    app = models.ForeignKey(App, on_delete=models.CASCADE)
    name = models.CharField(max_length=50)
    extra1 = models.TextField()
    extra2 = models.TextField()
    host_ids = models.TextField()
    desc = models.CharField(max_length=255, null=True)

    created_at = models.CharField(max_length=20, default=human_time)
    created_by = models.ForeignKey(User, models.PROTECT, related_name='+')

    def __repr__(self):
        return f'<DeployRequest app_id={self.app_id} name={self.name}>'

    class Meta:
        db_table = 'deploy_requests'
        ordering = ('-id',)
