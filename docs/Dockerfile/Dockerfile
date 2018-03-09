FROM alpine:3.6

RUN echo -e "http://mirrors.aliyun.com/alpine/v3.6/main\nhttp://mirrors.aliyun.com/alpine/v3.6/community" > /etc/apk/repositories
RUN apk update && apk add --no-cache ca-certificates python3 nginx mariadb nodejs-npm git 
RUN apk add --no-cache --virtual .build-deps python3-dev gcc musl-dev libffi-dev openssl-dev make \
    && git clone https://github.com/openspug/spug.git /spug \
    && cd /spug && git pull \
    && pip3 install --no-cache-dir -r /spug/spug_api/requirements.txt \
    && pip3 install --no-cache-dir gunicorn \	
    && apk del .build-deps 
RUN cd /spug/spug_web/ && npm i -d --registry=https://registry.npm.taobao.org \
    && npm run build \
    && mv /var/lib/nginx/html /var/lib/nginx/html.bak && mv /spug/spug_web/dist /var/lib/nginx/html 
	
ADD default.conf /etc/nginx/conf.d/default.conf
ADD entrypoint.sh /entrypoint.sh
ADD scripts /scripts

ENTRYPOINT ["sh", "/entrypoint.sh"]