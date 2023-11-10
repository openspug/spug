# Copyright: (c) OpenSpug Organization. https://github.com/openspug/spug
# Copyright: (c) <spug.dev@gmail.com>
# Released under the AGPL-3.0 License.
from functools import lru_cache
from apps.setting.models import Setting, KEYS_DEFAULT
from libs.ssh import SSH
import json


class AppSetting:
    @classmethod
    @lru_cache(maxsize=64)
    def get(cls, key):
        info = Setting.objects.filter(key=key).first()
        if not info:
            raise KeyError(f'no such key for {key!r}')
        return info.real_val

    @classmethod
    def get_default(cls, key, default=None):
        info = Setting.objects.filter(key=key).first()
        if not info:
            return default
        return info.real_val

    @classmethod
    def set(cls, key, value, desc=None):
        if key in KEYS_DEFAULT:
            value = json.dumps(value)
            Setting.objects.update_or_create(key=key, defaults={'value': value, 'desc': desc})
        else:
            raise KeyError('invalid key')

    @classmethod
    def delete(cls, key):
        Setting.objects.filter(key=key).delete()

    @classmethod
    def get_ssh_key(cls):
        public_key = cls.get_default('public_key')
        private_key = cls.get_default('private_key')
        if not private_key or not public_key:
            private_key, public_key = SSH.generate_key()
            cls.set('private_key', private_key)
            cls.set('public_key', public_key)
        return private_key, public_key
