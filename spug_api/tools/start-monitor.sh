#!/bin/bash
# start monitor service
cd $(dirname $(dirname $0))
source ./venv/bin/activate
exec python manage.py runmonitor