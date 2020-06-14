#!/bin/sh
# Copyright: (c) OpenSpug Organization. https://github.com/openspug/spug
# Copyright: (c) <spug.dev@gmail.com>
# Released under the AGPL-3.0 License.

set -e

# init nginx
if [ ! -d /run/nginx ]; then
    mkdir -p /run/nginx
    chown -R nginx.nginx /run/nginx
fi

# init spug
if [ ! -f /spug/spug_api/db.sqlite3 ]; then
    cd /spug/spug_api
    python manage.py initdb
    python manage.py useradd -u admin -p spug.dev -s -n 管理员
fi

nginx
supervisord -c /etc/supervisord.conf