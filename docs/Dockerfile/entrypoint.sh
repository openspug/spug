#!/bin/sh
#
set -e


# init db
if [ -z $MYSQL_HOST ]; then
    if [ ! -d /var/lib/mysql/mysql ]; then
        echo 'Initializing db, please wait ...'
        REQUIRE_INIT_OPS=true
        /bin/sh /scripts/init_db.sh
    fi
    nohup /usr/bin/mysqld_safe --datadir=/var/lib/mysql --user=root &
fi

# init nginx
if [ ! -d /run/nginx ]; then
    mkdir -p /run/nginx
    chown -R nginx.nginx /run/nginx
fi

# init config
if [ ! -f /init_config.lock ]; then
    /bin/sh /scripts/init_config.sh
    touch /init_config.lock
fi


cd /spug/spug_api
nginx
sleep 3
if [ $REQUIRE_INIT_OPS == true ]; then
    /usr/local/bin/python3 /scripts/init_spug.py
fi
gunicorn --threads=32 main:app -b 0.0.0.0:3000
