#!/bin/bash
# Copyright: (c) OpenSpug Organization. https://github.com/openspug/spug
# Copyright: (c) <spug.dev@gmail.com>
# Released under the MIT License.
# start monitor service

cd $(dirname $(dirname $0))
source ./venv/bin/activate
exec python manage.py runmonitor
