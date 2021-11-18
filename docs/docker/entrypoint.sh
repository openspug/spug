#!/bin/bash
#
set -e

if [ -e /root/.bashrc ]; then
    source /root/.bashrc
fi

if [ ! -d /data/spug ]; then
    tar xf /tmp/spug.tar.gz -C /data/
    SECRET_KEY=$(< /dev/urandom tr -dc '!@#%^.a-zA-Z0-9' | head -c50)
    cat > /data/spug/spug_api/spug//overrides.py << EOF
DEBUG = False
ALLOWED_HOSTS = ['127.0.0.1']
SECRET_KEY = '${SECRET_KEY}'

DATABASES = {
    'default': {
        'ATOMIC_REQUESTS': True,
        'ENGINE': 'django.db.backends.mysql',
        'NAME': 'spug',
        'USER': 'spug',
        'PASSWORD': 'spug.dev',
        'HOST': 'localhost',
        'OPTIONS': {
            'unix_socket': '/var/lib/mysql/mysql.sock',
            'charset': 'utf8mb4',
            'sql_mode': 'STRICT_TRANS_TABLES',
        }
    }
}
EOF
fi

if [ ! -d /data/mysql ]; then
    mkdir -p /data/mysql
    mysql_install_db
    chown -R mysql.mysql /data/mysql

    tfile=`mktemp`
    cat >> $tfile << EOF
use mysql;
flush privileges;
create database spug character set utf8mb4 collate utf8mb4_unicode_ci;
grant all on spug.* to spug@'localhost' identified by 'spug.dev';
flush privileges;
EOF

    /usr/libexec/mysqld --user=mysql --bootstrap < $tfile
    rm -f $tfile
fi

exec supervisord -c /etc/supervisord.conf
