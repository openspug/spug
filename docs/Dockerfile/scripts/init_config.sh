set -e 

cat >> /spug/spug_api/config.py << EOF
from pytz import timezone
import os

DEBUG = True
TIME_ZONE = timezone('Asia/Shanghai')
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DOCKER_URL = 'unix:///var/run/docker.sock'
SQLALCHEMY_ECHO = False

EOF
echo "SQLALCHEMY_DATABASE_URI = 'mysql+pymysql://${MYSQL_USER:-spuguser}:${MYSQL_PASSWORD:-spugpwd}@localhost/${MYSQL_DATABASE:-spug}'" >> /spug/spug_api/config.py
echo "DOCKER_REGISTRY_SERVER = '${REGISTRY_SERVER:-hub.qbangmang.com}'" >> /spug/spug_api/config.py
echo "DOCKER_REGISTRY_AUTH = {'username': '${REGISTRY_USER}', 'password': '${REGISTRY_PASSWORD}'}" >> /spug/spug_api/config.py
