# Copyright: (c) OpenSpug Organization. https://github.com/openspug/spug
# Copyright: (c) <spug.dev@gmail.com>
# Released under the MIT License.
from django.db import models
from libs import ModelMixin, human_datetime
from apps.account.models import User


class ExecTemplate(models.Model, ModelMixin):
    name = models.CharField(max_length=50)
    type = models.CharField(max_length=50)
    body = models.TextField()
    desc = models.CharField(max_length=255, null=True)

    created_at = models.CharField(max_length=20, default=human_datetime)
    created_by = models.ForeignKey(User, models.PROTECT, related_name='+')
    updated_at = models.CharField(max_length=20, null=True)
    updated_by = models.ForeignKey(User, models.PROTECT, related_name='+', null=True)

    def __repr__(self):
        return '<ExecTemplate %r>' % self.name

    class Meta:
        db_table = 'exec_templates'
        ordering = ('-id',)
