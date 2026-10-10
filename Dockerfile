# syntax=docker/dockerfile:1
#
# Spug all-in-one image: the backend, the built web UI and every runtime dependency are
# baked in, so a container needs no network access to start (unlike docs/docker, which
# downloads the code on first start). Published as openspug/spug and ghcr.io/openspug/spug
# by .github/workflows/docker-image.yml.
#
#   docker buildx build --platform linux/amd64,linux/arm64 -t spug:dev .
#
# Builders in mainland China can point the package indexes at local mirrors:
#   --build-arg PIP_INDEX_URL=https://mirrors.aliyun.com/pypi/simple/
#   --build-arg NPM_REGISTRY=https://registry.npmmirror.com

ARG PIP_INDEX_URL=https://pypi.org/simple/
ARG NPM_REGISTRY=https://registry.npmjs.org/

# ---- web UI: static output, identical on every architecture, so build it once natively ----
FROM --platform=$BUILDPLATFORM node:20-bookworm-slim AS web
ARG NPM_REGISTRY
WORKDIR /src/spug_web
COPY spug_web/package.json ./
RUN npm install --no-audit --no-fund --loglevel=error --registry=$NPM_REGISTRY
COPY spug_web/ ./
RUN npm run build

# ---- python packages: compile mysqlclient / python-ldap here and keep compilers out of the final image ----
FROM python:3.11-slim-bookworm AS python-deps
ARG PIP_INDEX_URL
RUN apt-get update && apt-get install -y --no-install-recommends \
        gcc pkg-config default-libmysqlclient-dev libldap2-dev libsasl2-dev libssl-dev \
    && rm -rf /var/lib/apt/lists/*
COPY spug_api/requirements.txt /tmp/requirements.txt
RUN pip install --no-cache-dir -i $PIP_INDEX_URL --prefix=/install -r /tmp/requirements.txt mysqlclient

# ---- runtime ----
# bookworm needs Docker 20.10.10 or later: older engines' default seccomp profile rejects the
# clone3 syscall of newer glibc (the entrypoint detects that). bullseye, which avoided it, is
# archived and can no longer install packages.
FROM python:3.11-slim-bookworm

LABEL org.opencontainers.image.title="Spug" \
      org.opencontainers.image.description="Agentless ops platform: hosts, batch execution, web terminal, deployments, pipelines, cron jobs, monitoring and alerts" \
      org.opencontainers.image.source="https://github.com/openspug/spug" \
      org.opencontainers.image.url="https://ops.spug.cc" \
      org.opencontainers.image.licenses="AGPL-3.0"

# runtime only: nginx/redis/supervisor run the services, libmariadb3/libldap/libsasl2 back the
# compiled wheels, git/rsync/sshpass/sshfs/ssh are used by deployments and file transfer,
# iputils-ping by the ping monitor.
RUN apt-get update && apt-get install -y --no-install-recommends \
        nginx redis-server supervisor \
        libmariadb3 libldap-2.5-0 libsasl2-2 \
        ca-certificates git curl wget unzip openssh-client sshpass rsync sshfs \
        iputils-ping net-tools procps locales tzdata \
    && sed -i 's/^# *en_US.UTF-8 UTF-8/en_US.UTF-8 UTF-8/' /etc/locale.gen && locale-gen en_US.UTF-8 \
    && rm -rf /var/lib/apt/lists/*

COPY --from=python-deps /install /usr/local

# TZ drives scheduled tasks and the timestamps shown in the UI; override it per container.
ENV LANG=en_US.UTF-8 \
    LC_ALL=en_US.UTF-8 \
    TZ=UTC \
    PYTHONUNBUFFERED=1

COPY docs/docker/nginx.conf /etc/nginx/nginx.conf
COPY docs/docker/redis.conf /etc/redis.conf
COPY docs/docker/spug.ini /etc/supervisord.conf
COPY docs/docker/ssh_config /etc/ssh/ssh_config
COPY docker/init_spug /usr/bin/init_spug
COPY docker/entrypoint.sh /entrypoint.sh

# pristine code; the entrypoint syncs it into the /data volume on every start
COPY spug_api /opt/spug/spug_api
COPY --from=web /src/spug_web/build /opt/spug/spug_web/build

RUN chmod +x /entrypoint.sh /usr/bin/init_spug \
    && mkdir -p /data /var/log/supervisor /run/nginx

VOLUME /data
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=5s --start-period=120s --retries=3 \
    CMD curl -fsS -o /dev/null http://127.0.0.1/api/account/login/ || exit 1
ENTRYPOINT ["/entrypoint.sh"]
