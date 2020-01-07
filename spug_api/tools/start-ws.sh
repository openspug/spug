#!/bin/bash
# start websocket service
cd $(dirname $(dirname $0))
source ./venv/bin/activate
exec daphne -p 9002 spug.asgi:application