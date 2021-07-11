# Copyright: (c) OpenSpug Organization. https://github.com/openspug/spug
# Copyright: (c) <spug.dev@gmail.com>
# Released under the AGPL-3.0 License.

# Git
FROM alpine/git:v2.30.1 as git

ARG VERSION=v2.3.16

WORKDIR /

RUN git clone https://github.com/openspug/spug.git --depth 1 -b ${VERSION} spug


# Build Front
FROM node:14-alpine as builder-front

COPY --from=git /spug /spug

WORKDIR /spug/spug_web/

RUN yarn

RUN yarn run build


# Build Backend
FROM python:3.9.4-alpine3.13 as builder

RUN echo -e "http://mirrors.aliyun.com/alpine/v3.13/main\nhttp://mirrors.aliyun.com/alpine/v3.13/community" > /etc/apk/repositories \
    && apk update

RUN pip config set global.index-url https://mirrors.aliyun.com/pypi/simple/

RUN apk add --no-cache \
    bash \              
    git \               
    nginx \
    supervisor \
    openssh-client \    
    openldap-dev \      
    mariadb-dev         # mysql_config for python mysqlclient

RUN apk add --no-cache --virtual .build-deps \
    gcc \
    make \
    musl-dev \
    libressl-dev \
    libffi-dev \
    rust \             
    cargo              # python cryptography

ADD spug.ini /etc/supervisor.d/spug.ini
ADD default.conf /etc/nginx/conf.d/default.conf
ADD entrypoint.sh /entrypoint.sh
ADD create_admin /usr/bin/create_admin
ADD delete_admin /usr/bin/delete_admin
ADD generate_secret_key /usr/bin/generate_secret_key

COPY --from=git /spug /spug
COPY --from=builder-front /spug/spug_web/build /var/www/build

WORKDIR /spug/spug_api/

RUN pip install -r requirements.txt
RUN pip install gunicorn mysqlclient

# Clean
#   1. Build Dependencies
RUN apk del .build-deps
#   2. Cargo
RUN rm -rf /root/.cargo

# PATCH
COPY patches/overrides.py /spug/spug_api/spug/overrides.py
COPY patches/user.py /spug/spug_api/apps/account/management/commands/user.py
# COPY patches/settings.py /spug/spug_api/spug/settings.py


ENTRYPOINT ["sh", "/entrypoint.sh"]