import django
import sys
import os

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.append(BASE_DIR)

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "spug.settings")
django.setup()

from django.conf import settings
import subprocess
import shutil
import sys
import os
import re


class Version:
    def __init__(self, version):
        self.version = re.sub('[^0-9.]', '', version).split('.')

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
    if old_version < Version('v3.0.2'):
        old_path = os.path.join(settings.BASE_DIR, 'repos')
        new_path = os.path.join(settings.REPOS_DIR)
        if not os.path.exists(new_path):
            print('执行 v3.0.1-beta.8 repos目录迁移')
            shutil.move(old_path, new_path)
            task = subprocess.Popen(f'cd {settings.BASE_DIR} && git checkout -- repos', shell=True)
            if task.wait() != 0:
                print('repos目录迁移失败，请联系官方人员')
