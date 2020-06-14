# Copyright: (c) OpenSpug Organization. https://github.com/openspug/spug
# Copyright: (c) <spug.dev@gmail.com>
# Released under the AGPL-3.0 License.

FROM python:3.6.10-alpine3.11

RUN echo -e "http://mirrors.aliyun.com/alpine/v3.11/main\nhttp://mirrors.aliyun.com/alpine/v3.11/community" > /etc/apk/repositories
RUN apk update && apk add --no-cache  nginx mariadb nodejs-npm git build-base openldap-dev supervisor redis bash
RUN apk add --no-cache --virtual .build-deps  openssl-dev gcc musl-dev python3-dev libffi-dev openssh-client make \
    && mkdir /etc/supervisor.d


ENV VERSION=2.2.0
RUN git clone https://github.com/openspug/spug.git --depth=1 /spug && cd /spug && git pull

RUN pip config set global.index-url https://mirrors.aliyun.com/pypi/simple/  && pip install --upgrade pip && pip install --no-cache-dir -r /spug/spug_api/requirements.txt \
    && pip install --no-cache-dir gunicorn \
    && apk del .build-deps

RUN cd /spug/spug_web/ && npm i --registry=https://registry.npm.taobao.org && npm run build \
    && mv /spug/spug_web/build /var/www/

ADD spug.ini /etc/supervisor.d/spug.ini
ADD default.conf /etc/nginx/conf.d/default.conf
ADD entrypoint.sh /entrypoint.sh


ENTRYPOINT ["sh", "/entrypoint.sh"]
