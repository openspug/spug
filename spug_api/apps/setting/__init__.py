from apps.setting.models import GlobalConfig
from functools import lru_cache


class ProxySetting(object):
    @lru_cache()
    def __read_setting_by_key(self, key):
        line = GlobalConfig.query.filter_by(name=key).first()
        if line:
            return line.value
        raise AttributeError('No such config %r' % key)

    @staticmethod
    def has(key):
        if GlobalConfig.query.filter_by(name=key).first():
            return True
        return False

    def __getattr__(self, item):
        if item in self.__dict__:
            return self.__dict__[item]
        return self.__read_setting_by_key(item)

    def __setattr__(self, key, value):
        raise AttributeError('Does not support overwrite config')

    def __delattr__(self, item):
        raise AttributeError('Does not support delete config')


Setting = ProxySetting()
