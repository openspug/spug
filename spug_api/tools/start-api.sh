#!/bin/bash
# start api service
cd $(dirname $(dirname $0))
source ./venv/bin/activate
exec gunicorn -b :9001 -w 2 --threads 8 --access-logfile - spug.wsgi