# Copyright: (c) OpenSpug Organization. https://github.com/openspug/spug
# Copyright: (c) <spug.dev@gmail.com>
# Released under the AGPL-3.0 License.

FROM python:3.6.10-alpine3.11 as builder

RUN echo -e "http://mirrors.aliyun.com/alpine/v3.11/main\nhttp://mirrors.aliyun.com/alpine/v3.11/community" > /etc/apk/repositories
RUN apk update && apk add --no-cache  nodejs-npm git build-base openldap-dev supervisor
RUN apk add --no-cache --virtual .build-deps  openssl-dev gcc musl-dev python3-dev libffi-dev make \
    && mkdir /etc/supervisor.d

RUN git clone https://github.com/openspug/spug.git --depth=1 /spug && cd /spug && git pull

RUN pip config set global.index-url https://mirrors.aliyun.com/pypi/simple/  && pip install --upgrade pip &&  pip install wheel && pip wheel -r /spug/spug_api/requirements.txt  --wheel-dir=/pippacks/wheels \
    && pip wheel gunicorn --wheel-dir=/pippacks/wheels \
    && apk del .build-deps
RUN cd /spug/spug_web/ && npm i --registry=https://registry.npm.taobao.org && npm run build



FROM python:3.6.10-alpine3.11
ENV VERSION=2.2.0
RUN echo -e "http://mirrors.aliyun.com/alpine/v3.11/main\nhttp://mirrors.aliyun.com/alpine/v3.11/community" > /etc/apk/repositories

# 这里也是可以优化的地方，有一些软件可以外置，可作为dockerfile参数项决定需不需要build进来
RUN apk update && apk add --no-cache  nginx mariadb supervisor redis bash git openssh-client openldap-dev

COPY --from=builder /pippacks /pippacks
COPY --from=builder /spug /spug
COPY --from=builder /spug/spug_web/build /var/www/build
RUN cd /spug/spug_api/ &&  pip install --no-index --find-links=/pippacks/wheels -r requirements.txt && pip install gunicorn --no-index --find-links=/pippacks/wheels

RUN rm -rf /pippacks

ADD spug.ini /etc/supervisor.d/spug.ini
ADD default.conf /etc/nginx/conf.d/default.conf
ADD entrypoint.sh /entrypoint.sh


ENTRYPOINT ["sh", "/entrypoint.sh"]