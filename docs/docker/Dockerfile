FROM centos:7.8.2003

ENV TZ=Asia/Shanghai
RUN yum install -y epel-release https://packages.endpointdev.com/rhel/7/os/x86_64/endpoint-repo.x86_64.rpm && yum install -y --setopt=tsflags=nodocs nginx redis mariadb-server mariadb-devel python36 python36-devel openldap-devel supervisor git gcc wget sshpass && yum -y clean all --enablerepo='*'

RUN pip3 install --upgrade pip -i https://pypi.doubanio.com/simple/
RUN pip3 install --no-cache-dir -i https://pypi.doubanio.com/simple/ \
    gunicorn \
    mysqlclient \
    apscheduler==3.7.0 \
    asgiref==3.2.10 \
    Django==2.2.27 \
    channels==2.3.1 \
    channels_redis==2.4.1 \
    paramiko==2.10.3 \
    django-redis==4.10.0 \
    requests==2.22.0 \
    GitPython==3.0.8 \
    python-ldap==3.2.0 \
    openpyxl==3.0.3

ENV LANG=en_US.UTF-8
RUN echo -e '\n# Source definitions\n. /etc/profile\n' >> /root/.bashrc
RUN mkdir /data
COPY init_spug /usr/bin/
COPY nginx.conf /etc/nginx/
COPY ssh_config /etc/ssh/
COPY spug.ini /etc/supervisord.d/
COPY my.cnf /etc/
COPY redis.conf /etc/
COPY entrypoint.sh /
COPY spug.tar.gz /tmp/

VOLUME /data
EXPOSE 80
ENTRYPOINT ["/entrypoint.sh"]
