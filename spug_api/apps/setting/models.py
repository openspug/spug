# Copyright: (c) OpenSpug Organization. https://github.com/openspug/spug
# Copyright: (c) <spug.dev@gmail.com>
# Released under the AGPL-3.0 License.
from django.db import models
from libs import ModelMixin
import json

KEYS_DEFAULT = {
    'MFA': {'enable': False},
    'verify_ip': True,
    'bind_ip': True,
    'ldap_service': {},
    'spug_key': None,
    'api_key': None,
    'mail_service': {},
    'private_key': None,
    'public_key': None,
}


class Setting(models.Model, ModelMixin):
    key = models.CharField(max_length=50, unique=True)
    value = models.TextField()
    desc = models.CharField(max_length=255, null=True)

    def to_view(self):
        tmp = self.to_dict(selects=('key',))
        tmp['value'] = self.real_val
        return tmp

    @property
    def real_val(self):
        if self.value:
            return json.loads(self.value)
        else:
            return KEYS_DEFAULT.get(self.key)

    def __repr__(self):
        return '<Setting %r>' % self.key

    class Meta:
        db_table = 'settings'
