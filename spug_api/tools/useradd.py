import argparse
import django
import sys
import os

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.append(BASE_DIR)

os.environ.setdefault("DJANGO_SETTINGS_MODULE", 'spug.settings')
django.setup()

from apps.account.models import User

parser = argparse.ArgumentParser(description='创建用户')
parser.add_argument('-u', required=True, metavar='username', help='账户名称')
parser.add_argument('-p', required=True, metavar='password', help='账户密码')
parser.add_argument('-n', default='', metavar='nickname', help='账户昵称')
parser.add_argument('-s', default=False, action='store_true', help='是否是超级用户（默认否）')

args = parser.parse_args()

User.objects.create(
    username=args.u,
    nickname=args.n,
    password_hash=User.make_password(args.p),
    is_supper=args.s,
)

print('创建成功')
