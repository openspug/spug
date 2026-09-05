#!/bin/bash
# Copyright: (c) OpenSpug Organization. https://github.com/openspug/spug
# Copyright: (c) <spug.dev@gmail.com>
# Released under the AGPL-3.0 License.
# start api service

cd $(dirname $(dirname $0))
if [ -f ./venv/bin/activate ]; then
  source ./venv/bin/activate
fi
# --timeout: 智能体 SSE 为长连接，需放宽 worker 超时避免被 gunicorn 掐断
# --threads: SSE 连接会长期占用线程，适当放大线程池，避免挤占普通接口
exec gunicorn -b 127.0.0.1:9001 -w 2 --threads 32 --timeout 3600 --access-logfile - spug.wsgi
