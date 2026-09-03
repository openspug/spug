#!/bin/bash
# Copyright: (c) OpenSpug Organization. https://github.com/openspug/spug
# Copyright: (c) <spug.dev@gmail.com>
# Released under the AGPL-3.0 License.
#
# Spug 4.x 一键安装脚本（在一台干净的 Linux 上手动部署，适合快速体验；生产环境推荐 Docker 安装：https://ops.spug.cc/docs/install-docker）
# 支持 Debian / Ubuntu 与 RHEL 系（CentOS Stream / Rocky / AlmaLinux / Fedora 等），需要 root 权限、Python 3.8 及以上、可访问外网。
# 可通过环境变量覆盖：SPUG_VERSION（默认 v4.0.0，须与 https://cdn.spug.cc/spug/web_<版本>.tar.gz 配套）、ADMIN_PASSWORD、DB_PASSWORD

set -e

SPUG_VERSION=${SPUG_VERSION:-v4.0.0}
SPUG_DIR=/data/spug
ADMIN_USER=${ADMIN_USER:-admin}
ADMIN_PASSWORD=${ADMIN_PASSWORD:-spug.cc}
DB_PASSWORD=${DB_PASSWORD:-spug.cc}
PIP_INDEX=${PIP_INDEX:-https://pypi.tuna.tsinghua.edu.cn/simple/}


function spug_banner() {

echo "                           ";
echo " ####  #####  #    #  #### ";
echo "#      #    # #    # #    #";
echo " ####  #    # #    # #     ";
echo "     # #####  #    # #  ###";
echo "#    # #      #    # #    #";
echo " ####  #       ####   #### ";
echo "                           ";

}


function check_env() {
    if [ "$(id -u)" -ne 0 ]; then
        echo "请使用 root 用户执行本脚本"
        exit 1
    fi
    if [ -e "$SPUG_DIR" ]; then
        echo "目录 $SPUG_DIR 已存在，请先移除或备份后再执行（升级请参考 https://ops.spug.cc/docs/update-version）"
        exit 1
    fi
}


# 找一个 3.8 及以上的 Python（Django 4.2 的最低要求）
function find_python() {
    for py in python3.12 python3.11 python3.10 python3.9 python3.8 python3; do
        if command -v $py > /dev/null 2>&1 && $py -c 'import sys; sys.exit(0 if sys.version_info >= (3, 8) else 1)' 2> /dev/null; then
            PYTHON=$(command -v $py)
            return 0
        fi
    done
    return 1
}


function init_system_lib() {
    source /etc/os-release
    case " $ID $ID_LIKE " in
        *debian*|*ubuntu*)
            echo "开始安装依赖: git mariadb-server libmariadb-dev python3-dev python3-venv gcc pkg-config libsasl2-dev libldap2-dev libssl-dev redis-server nginx supervisor rsync sshfs iputils-ping"
            export DEBIAN_FRONTEND=noninteractive
            apt-get update
            apt-get install -y git curl mariadb-server libmariadb-dev python3-dev python3-venv gcc pkg-config libsasl2-dev libldap2-dev libssl-dev redis-server nginx supervisor rsync sshfs iputils-ping
            rm -f /etc/nginx/sites-enabled/default
            MYSQL_CONF=/etc/mysql/conf.d/spug.cnf
            SUPERVISOR_CONF=/etc/supervisor/conf.d/spug.conf
            REDIS_SRV=redis-server
            SUPERVISOR_SRV=supervisor
            ;;
        *rhel*|*centos*|*fedora*)
            echo "开始安装依赖: git mariadb-server mariadb-connector-c-devel python3-devel gcc pkgconfig openldap-devel cyrus-sasl-devel openssl-devel redis nginx supervisor rsync fuse-sshfs iputils"
            yum install -y epel-release || true
            # RHEL 8/9 系的部分开发包（openldap-devel 等）位于 CRB / PowerTools 仓库
            (dnf config-manager --set-enabled crb || dnf config-manager --set-enabled powertools) > /dev/null 2>&1 || true
            yum install -y git mariadb-server python3-devel gcc pkgconfig openldap-devel cyrus-sasl-devel openssl-devel redis nginx supervisor rsync fuse-sshfs iputils
            # RHEL 9 系自带 curl-minimal，与 curl 包冲突，仅在没有 curl 命令时才安装
            command -v curl > /dev/null 2>&1 || yum install -y curl
            # mysqlclient 需要 mariadb_config：RHEL 8/9 系为 mariadb-connector-c-devel，CentOS 7 为 mariadb-devel
            yum install -y mariadb-connector-c-devel || yum install -y mariadb-devel
            # 系统自带的 python3 低于 3.8 时（如 RHEL 8 系），尝试安装 AppStream 提供的 python39
            find_python || yum install -y python39 python39-devel || true
            sed -i 's/ default_server//g' /etc/nginx/nginx.conf
            MYSQL_CONF=/etc/my.cnf.d/spug.cnf
            SUPERVISOR_CONF=/etc/supervisord.d/spug.ini
            REDIS_SRV=redis
            SUPERVISOR_SRV=supervisord
            ;;
        *)
            echo "暂不支持的系统: $ID，请参考手动部署文档 https://ops.spug.cc/docs/deploy-product"
            exit 1
            ;;
    esac

    if ! find_python; then
        echo "未找到 Python 3.8 及以上版本，请先安装（RHEL 8 系可执行 yum install python39 python39-devel）后重新运行本脚本"
        exit 1
    fi
    echo "使用的 Python: $PYTHON ($($PYTHON --version 2>&1))"
}


function install_spug() {
  echo "开始安装 Spug $SPUG_VERSION ..."
  mkdir -p /data
  git clone -b $SPUG_VERSION --depth=1 https://gitee.com/openspug/spug.git $SPUG_DIR
  curl -fo /tmp/spug_web.tar.gz https://cdn.spug.cc/spug/web_${SPUG_VERSION}.tar.gz
  tar xf /tmp/spug_web.tar.gz -C $SPUG_DIR/spug_web/
  rm -f /tmp/spug_web.tar.gz
  cd $SPUG_DIR/spug_api
  $PYTHON -m venv venv
  source venv/bin/activate

  pip install -U pip wheel -i $PIP_INDEX
  pip install -r requirements.txt mysqlclient -i $PIP_INDEX
}


function setup_conf() {

  echo "开始生成配置..."
# mysql conf
cat << EOF > $MYSQL_CONF
[mysqld]
bind-address=127.0.0.1
EOF

# spug conf
SECRET_KEY=$(< /dev/urandom tr -dc '!@#%^.a-zA-Z0-9' | head -c50)
cat << EOF > spug/overrides.py
DEBUG = False
ALLOWED_HOSTS = ['127.0.0.1']
SECRET_KEY = '${SECRET_KEY}'

DATABASES = {
    'default': {
        'ATOMIC_REQUESTS': True,
        'ENGINE': 'django.db.backends.mysql',
        'NAME': 'spug',
        'USER': 'spug',
        'PASSWORD': '${DB_PASSWORD}',
        'HOST': '127.0.0.1',
        'OPTIONS': {
            'charset': 'utf8mb4',
            'sql_mode': 'STRICT_TRANS_TABLES',
        }
    }
}
EOF

# supervisor conf（与仓库中的 spug_api/tools/supervisor-spug.ini 相同）
cp $SPUG_DIR/spug_api/tools/supervisor-spug.ini $SUPERVISOR_CONF

# nginx conf
cat << EOF > /etc/nginx/conf.d/spug.conf
server {
        listen 80 default_server;
        server_name _;
        root $SPUG_DIR/spug_web/build/;
        client_max_body_size 20m;   # 影响文件管理器可上传文件的大小限制

        gzip  on;
        gzip_min_length  1k;
        gzip_buffers     4 16k;
        gzip_http_version 1.1;
        gzip_comp_level 7;
        gzip_types       text/plain text/css text/javascript application/javascript application/json;
        gzip_vary on;

        location ^~ /api/ {
                rewrite ^/api(.*) \$1 break;
                proxy_pass http://127.0.0.1:9001;
                proxy_read_timeout 180s;
                proxy_redirect off;
                proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        }

        location ^~ /api/ws/ {
                rewrite ^/api(.*) \$1 break;
                proxy_pass http://127.0.0.1:9002;
                proxy_http_version 1.1;
                proxy_set_header Upgrade \$http_upgrade;
                proxy_set_header Connection "Upgrade";
                proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        }

        location / {
                try_files \$uri /index.html;
        }
}
EOF


systemctl start mariadb
systemctl enable mariadb

mysql -e "CREATE DATABASE IF NOT EXISTS spug DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
mysql -e "CREATE USER IF NOT EXISTS 'spug'@'127.0.0.1' IDENTIFIED BY '${DB_PASSWORD}';"
mysql -e "GRANT ALL ON spug.* TO 'spug'@'127.0.0.1'; FLUSH PRIVILEGES;"

python manage.py updatedb
python manage.py user add -u $ADMIN_USER -p $ADMIN_PASSWORD -s -n 管理员


systemctl enable nginx
systemctl enable $REDIS_SRV
systemctl enable $SUPERVISOR_SRV

systemctl restart nginx
systemctl restart $REDIS_SRV
systemctl restart $SUPERVISOR_SRV

}


spug_banner
check_env
init_system_lib
install_spug
setup_conf

echo -e "\n\n\033[33m安全警告：默认的数据库和 Redis 服务并不安全，请确保其仅监听在 127.0.0.1，推荐参考官网文档自行加固安全配置！\033[0m"
echo -e "\033[32m安装成功！\033[0m 通过浏览器访问 http://<服务器IP> 即可使用"
echo "默认管理员账户：$ADMIN_USER  密码：$ADMIN_PASSWORD"
echo "默认数据库用户：spug   密码：$DB_PASSWORD"
echo "配置文件：$SPUG_DIR/spug_api/spug/overrides.py，升级方法：https://ops.spug.cc/docs/update-version"
