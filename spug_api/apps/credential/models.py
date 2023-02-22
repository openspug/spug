# Copyright: (c) OpenSpug Organization. https://github.com/openspug/spug
# Copyright: (c) <spug.dev@gmail.com>
# Released under the AGPL-3.0 License.
from django.db import models
from libs.mixins import ModelMixin
from apps.account.models import User


class Credential(models.Model, ModelMixin):
    TYPES = (
        ('pw', '密码'),
        ('pk', '密钥'),
    )
    name = models.CharField(max_length=64)
    type = models.CharField(max_length=20, choices=TYPES)
    username = models.CharField(max_length=64)
    secret = models.TextField()
    extra = models.CharField(max_length=255, null=True)
    is_public = models.BooleanField(default=False)
    created_by = models.ForeignKey(User, on_delete=models.PROTECT)
    created_at = models.DateTimeField(auto_now_add=True)

    def to_view(self, user):
        is_self = self.created_by_id == user.id
        tmp = self.to_dict(excludes=None if is_self else ('secret', 'extra'))
        tmp['type_alias'] = self.get_type_display()
        return tmp

    class Meta:
        db_table = 'credentials'
        ordering = ('-id',)
