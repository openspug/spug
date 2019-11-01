set -e 

cat >> /spug/spug_api/config.py << EOF
from pytz import timezone
import os

DEBUG = True
TIME_ZONE = timezone('Asia/Shanghai')
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DOCKER_URL = 'unix:///var/run/docker.sock'
SQLALCHEMY_ECHO = False

LDAP_CONFIG = {
    'host': '172.24.64.55',
    'port': 389,
    'is_openldap':  True,
    'base_dn': 'dc=spug,dc=com',
    'admin_dn': 'cn=admin,dc=spug,dc=com',
    'admin_password': 'spugpwd',
    'user_filter': 'cn',
}

EOF

if [ -z $MYSQL_HOST ]; then
    echo "SQLALCHEMY_DATABASE_URI = 'mysql+pymysql://${MYSQL_USER:-spuguser}:${MYSQL_PASSWORD:-spugpwd}@localhost/${MYSQL_DATABASE:-spug}?unix_socket=/run/mysqld/mysqld.sock'" >> /spug/spug_api/config.py
else
    echo "SQLALCHEMY_DATABASE_URI = 'mysql+pymysql://${MYSQL_USER:-spuguser}:${MYSQL_PASSWORD:-spugpwd}@${MYSQL_HOST:-localhost}:${MYSQL_PORT:-3306}/${MYSQL_DATABASE:-spug}'" >> /spug/spug_api/config.py
fi
echo "DOCKER_REGISTRY_SERVER = '${REGISTRY_SERVER:-hub.qbangmang.com}'" >> /spug/spug_api/config.py
echo "DOCKER_REGISTRY_AUTH = {'username': '${REGISTRY_USER}', 'password': '${REGISTRY_PASSWORD}'}" >> /spug/spug_api/config.py

cat /spug/spug_api/config.py
