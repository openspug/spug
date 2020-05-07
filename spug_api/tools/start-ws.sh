#!/bin/bash
# Copyright: (c) OpenSpug Organization. https://github.com/openspug/spug
# Copyright: (c) <spug.dev@gmail.com>
# Released under the MIT License.
# start websocket service

cd $(dirname $(dirname $0))
if [ -f ./venv/bin/activate ]; then
  source ./venv/bin/activate
fi
exec daphne -p 9002 spug.asgi:application
