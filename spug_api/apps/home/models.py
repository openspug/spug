# Copyright: (c) OpenSpug Organization. https://github.com/openspug/spug
# Copyright: (c) <spug.dev@gmail.com>
# Released under the AGPL-3.0 License.
from django.db import models
from libs.mixins import ModelMixin
import json


class Notice(models.Model, ModelMixin):
    title = models.CharField(max_length=100)
    content = models.TextField()
    is_stress = models.BooleanField(default=False)
    read_ids = models.TextField(default='[]')
    sort_id = models.IntegerField(default=0, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def to_view(self):
        tmp = self.to_dict()
        tmp['read_ids'] = json.loads(self.read_ids)
        return tmp

    class Meta:
        db_table = 'notices'
        ordering = ('-sort_id',)


class Navigation(models.Model, ModelMixin):
    title = models.CharField(max_length=64)
    desc = models.CharField(max_length=128)
    logo = models.TextField()
    links = models.TextField()
    sort_id = models.IntegerField(default=0, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def to_view(self):
        tmp = self.to_dict()
        tmp['links'] = json.loads(self.links)
        return tmp

    class Meta:
        db_table = 'navigations'
        ordering = ('-sort_id',)
