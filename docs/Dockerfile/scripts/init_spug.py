import sys
import os
sys.path.append('/spug/spug_api')
import random
import string
from public import db
from config import BASE_DIR
from apps.account.models import User
import apps.configuration.models
import apps.deploy.models
import apps.assets.models
import apps.schedule.models
import apps.setting.models


# init database
db.drop_all()
db.create_all()
with open(os.path.join(BASE_DIR, 'libs', 'sql', 'permissions.sql'), 'r') as f:
    line = f.readline()
    while line:
        if line.startswith('INSERT INTO'):
            db.engine.execute(line.strip())
        line = f.readline()

# create default admin
username = 'admin'
password = 'spug'
User(username=username, password=password, nickname='Administrator', is_supper=True).save()

print('*' * 80)
print('Database name: ' + (os.getenv('MYSQL_DATABASE') or 'spug'))
print('Database username: ' + (os.getenv('MYSQL_USER') or 'spuguser'))
print('Database password: ' + (os.getenv('MYSQL_PASSWORD') or 'spugpwd'))
print('Login web site account: %s  %s' % (username, password))
print('*' * 80)
