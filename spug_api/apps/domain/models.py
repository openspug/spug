# Copyright: (c) OpenSpug Organization. https://github.com/openspug/spug
# Copyright: (c) <spug.dev@gmail.com>
# Released under the AGPL-3.0 License.

from django.db import models
from libs import ModelMixin, human_datetime

class Domain(models.Model, ModelMixin):
    name = models.CharField(max_length=128)
    domain_name = models.CharField(max_length=128)
    alarm_day = models.IntegerField(default=30)
    domain_end_time = models.CharField(max_length=20, default=human_datetime)
    cert_end_time = models.CharField(max_length=20, default=human_datetime)
    is_active = models.BooleanField(default=True)
    desc = models.CharField(max_length=255, default='')
    created_at = models.CharField(max_length=20, default=human_datetime)

    def __repr__(self):
        return '<Domain %r>' % self.name

    class Meta:
        db_table = 'domain'
        ordering = ('-id',)
