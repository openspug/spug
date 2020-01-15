# Copyright: (c) OpenSpug Organization. https://github.com/openspug/spug
# Copyright: (c) <spug.dev@gmail.com>
# Released under the MIT License.
from functools import lru_cache
from apps.setting.models import Setting


class AppSetting:
    keys = ('public_key', 'private_key', 'mail_service', 'api_key', 'spug_key')

    @classmethod
    @lru_cache(maxsize=64)
    def get(cls, key):
        info = Setting.objects.filter(key=key).first()
        if not info:
            raise KeyError(f'no such key for {key!r}')
        return info.value

    @classmethod
    def get_default(cls, key, default=None):
        info = Setting.objects.filter(key=key).first()
        if not info:
            return default
        return info.value

    @classmethod
    def set(cls, key, value, desc=None):
        if key in cls.keys:
            Setting.objects.update_or_create(key=key, defaults={'value': value, 'desc': desc})
        else:
            raise KeyError('invalid key')
