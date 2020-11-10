import django
import sys
import os

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.append(BASE_DIR)

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "spug.settings")
django.setup()

from django.conf import settings
from apps.app.models import App
import sys


class Version:
    def __init__(self, version):
        self.version = version.lstrip('vV').split('.')

    def __gt__(self, other):
        if not isinstance(other, Version):
            raise TypeError('required type Version')
        for v1, v2 in zip(self.version, other.version):
            if int(v1) == int(v2):
                continue
            elif int(v1) > int(v2):
                return True
            else:
                return False
        return False


if __name__ == '__main__':
    old_version = Version(sys.argv[1])
    now_version = Version(settings.SPUG_VERSION)
    if old_version < Version('v2.3.14'):
        app = App.objects.first()
        if app and hasattr(app, 'sort_id') and app.sort_id == 0:
            print('执行v2.3.14数据初始化')
            for app in App.objects.all():
                app.sort_id = app.id
                app.save()
