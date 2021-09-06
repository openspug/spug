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


if __name__ == '__main__':
    version = sys.argv[1]
    if version <= 'v3.0.1-beta.8':
        print('执行 v3.0.1-beta.8 repos目录迁移')
        old_path = os.path.join(settings.BASE_DIR, 'repos')
        new_path = os.path.join(settings.REPOS_DIR)
        shutil.move(old_path, new_path)
        task = subprocess.Popen(f'cd {settings.BASE_DIR} && git checkout -- repos', shell=True)
        if task.wait() != 0:
            print('repos目录迁移失败，请联系官方人员')
