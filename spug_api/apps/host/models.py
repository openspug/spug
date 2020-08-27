# Copyright: (c) OpenSpug Organization. https://github.com/openspug/spug
# Copyright: (c) <spug.dev@gmail.com>
# Released under the AGPL-3.0 License.
from django.db import models
from libs import ModelMixin, human_datetime
from apps.account.models import User
from apps.setting.utils import AppSetting
from libs.ssh import SSH


class Host(models.Model, ModelMixin):
    name = models.CharField(max_length=50)
    zone = models.CharField(max_length=50)
    hostname = models.CharField(max_length=50)
    port = models.IntegerField()
    username = models.CharField(max_length=50)
    pkey = models.TextField(null=True)
    desc = models.CharField(max_length=255, null=True)

    created_at = models.CharField(max_length=20, default=human_datetime)
    created_by = models.ForeignKey(User, models.PROTECT, related_name='+')
    deleted_at = models.CharField(max_length=20, null=True)
    deleted_by = models.ForeignKey(User, models.PROTECT, related_name='+', null=True)

    @property
    def private_key(self):
        return self.pkey or AppSetting.get('private_key')

    def get_ssh(self, pkey=None):
        pkey = pkey or self.private_key
        return SSH(self.hostname, self.port, self.username, pkey)

    def __repr__(self):
        return '<Host %r>' % self.name

    class Meta:
        db_table = 'hosts'
        ordering = ('-id',)
