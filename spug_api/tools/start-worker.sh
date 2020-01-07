#!/bin/bash
# start worker service
cd $(dirname $(dirname $0))
source ./venv/bin/activate
exec python manage.py runworker ssh_exec