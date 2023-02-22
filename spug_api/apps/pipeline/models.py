# Copyright: (c) OpenSpug Organization. https://github.com/openspug/spug
# Copyright: (c) <spug.dev@gmail.com>
# Released under the AGPL-3.0 License.
from django.db import models
from libs.mixins import ModelMixin
from apps.account.models import User
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

    class Meta:
        db_table = 'pipelines'
        ordering = ('-id',)
