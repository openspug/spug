from functools import lru_cache
from apps.setting.models import Setting


class AppSetting:
    keys = ('public_key', 'private_key')

    @classmethod
    @lru_cache(maxsize=64)
    def get(cls, key):
        info = Setting.objects.filter(key=key).first()
        if not info:
            raise KeyError(f'no such key for {key!r}')
        return info.value

    @classmethod
    def set(cls, key, value, desc=None):
        if key in cls.keys:
            Setting.objects.update_or_create(key=key, defaults={'value': value, 'desc': desc})
        else:
            raise KeyError('invalid key')
