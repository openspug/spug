FROM python:3.6-alpine
ENV VERSION=1.1.0

RUN echo -e "http://mirrors.aliyun.com/alpine/v3.10/main\nhttp://mirrors.aliyun.com/alpine/v3.10/community" > /etc/apk/repositories
RUN apk update && apk add --no-cache  nginx mariadb nodejs-npm git build-base openldap-dev
RUN apk add --no-cache --virtual .build-deps  openssl-dev gcc musl-dev python3-dev libffi-dev openssl-dev make 
RUN echo $VERSION && git clone https://github.com/openspug/spug.git --depth=1 /spug && cd /spug && git pull

RUN pip config set global.index-url https://mirrors.aliyun.com/pypi/simple/  && pip install --upgrade pip && pip install --no-cache-dir -r /spug/spug_api/requirements.txt \
    && pip install --no-cache-dir gunicorn \
    && apk del .build-deps

RUN cd /spug/spug_web/ && npm i --registry=https://registry.npm.taobao.org && npm run build \
    && mv /spug/spug_web/dist /var/www/

ADD default.conf /etc/nginx/conf.d/default.conf
ADD entrypoint.sh /entrypoint.sh
ADD scripts /scripts

ENTRYPOINT ["sh", "/entrypoint.sh"]
