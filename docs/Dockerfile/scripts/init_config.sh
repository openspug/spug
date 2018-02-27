set -e 

echo "SQLALCHEMY_DATABASE_URI = 'mysql+pymysql://${MYSQL_USER:-spuguser}:${MYSQL_PASSWORD:-spugpwd}@localhost/${MYSQL_DATABASE:-spug}'" >> /spug/spug_api/config.py
echo "DOCKER_REGISTRY_SERVER = '${REGISTRY_SERVER}'" >> /spug/spug_api/config.py
echo "DOCKER_REGISTRY_AUTH = {'username': '${REGISTRY_USER}', 'password': '${REGISTRY_PASSWORD}'}" >> /spug/spug_api/config.py
