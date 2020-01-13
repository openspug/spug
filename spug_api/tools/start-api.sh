#!/bin/bash
# start api service
cd $(dirname $(dirname $0))
source ./venv/bin/activate
exec gunicorn -b 127.0.0.1:9001 -w 2 --threads 8 --access-logfile - spug.wsgi