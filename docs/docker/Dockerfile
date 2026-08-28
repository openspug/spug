# 基础镜像使用 bullseye（glibc 2.31）：不少用户的宿主机仍是 CentOS 7（内核 3.10）+ 旧版 Docker，
# 更新的 glibc 会用到 clone3 等系统调用，被旧 docker 的默认 seccomp 拦截导致诡异失败。
FROM python:3.9-slim-bullseye

ENV TZ=Asia/Shanghai

# nginx/redis/supervisor 为运行时组件；gcc 与各 -dev 包用于编译 mysqlclient、python-ldap；
# iputils-ping 供监控中心的 Ping 检测使用，rsync/sshpass/sshfs 供文件分发与主机管理使用。
RUN apt-get update && apt-get install -y --no-install-recommends \
        nginx \
        redis-server \
        supervisor \
        git \
        curl \
        wget \
        unzip \
        gcc \
        pkg-config \
        default-libmysqlclient-dev \
        libldap2-dev \
        libsasl2-dev \
        libssl-dev \
        iputils-ping \
        net-tools \
        procps \
        sshpass \
        rsync \
        sshfs \
        locales \
        tzdata \
    && ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone \
    && rm -rf /var/lib/apt/lists/*

# 依赖版本需与 spug_api/requirements.txt 保持一致（代码在容器启动时才拉取，故此处预装）
RUN pip install --no-cache-dir --upgrade pip -i https://mirrors.aliyun.com/pypi/simple/
RUN pip install --no-cache-dir -i https://mirrors.aliyun.com/pypi/simple/ \
    apscheduler==3.10.4 \
    "Django>=4.2.0,<4.3.0" \
    paramiko==3.4.0 \
    "channels>=4.0.0,<5.0.0" \
    "daphne>=4.0.0,<5.0.0" \
    "gunicorn>=21.0.0" \
    "channels-redis>=4.1.0,<5.0.0" \
    "django_redis>=5.4.0,<6.0.0" \
    asgiref==3.7.2 \
    "requests>=2.31.0,<3.0.0" \
    python-ldap==3.4.3 \
    GitPython==3.1.40 \
    openpyxl==3.1.2 \
    user_agents==2.2.0 \
    mysqlclient \
    cryptography

RUN sed -i 's/^# *en_US.UTF-8 UTF-8/en_US.UTF-8 UTF-8/' /etc/locale.gen && locale-gen en_US.UTF-8
ENV LANG=en_US.UTF-8
ENV LC_ALL=en_US.UTF-8

RUN mkdir -p /data/repos /var/log/supervisor /run/nginx
COPY init_spug /usr/bin/
COPY nginx.conf /etc/nginx/
COPY ssh_config /etc/ssh/
# spug.ini 自带 [supervisord] 段，可直接作为 supervisord 主配置使用
COPY spug.ini /etc/supervisord.conf
COPY redis.conf /etc/
COPY entrypoint.sh /

RUN chmod +x /usr/bin/init_spug /entrypoint.sh

VOLUME /data
EXPOSE 80
ENTRYPOINT ["/entrypoint.sh"]
