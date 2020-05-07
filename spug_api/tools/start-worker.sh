#!/bin/bash
# Copyright: (c) OpenSpug Organization. https://github.com/openspug/spug
# Copyright: (c) <spug.dev@gmail.com>
# Released under the MIT License.
# start worker service

cd $(dirname $(dirname $0))
if [ -f ./venv/bin/activate ]; then
  source ./venv/bin/activate
fi
exec python manage.py runworker ssh_exec
