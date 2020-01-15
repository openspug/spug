# Copyright: (c) OpenSpug Organization. https://github.com/openspug/spug
# Copyright: (c) <spug.dev@gmail.com>
# Released under the MIT License.
from django.db import models
from libs import ModelMixin


class Setting(models.Model, ModelMixin):
    key = models.CharField(max_length=50, unique=True)
    value = models.TextField()
    desc = models.CharField(max_length=255, null=True)

    def __repr__(self):
        return '<Setting %r>' % self.key

    class Meta:
        db_table = 'settings'
