# 宿主网络 SSH 实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 让生产 Spug 容器中的 `127.0.0.1` 指向宿主机，从主机管理连接宿主机 SSH，并保持 Web 入口仅在 `127.0.0.1:8089` 提供。

**架构：** 生产 `spug` 服务改用 Linux host 网络，取消桥接网络的端口发布。Nginx 在宿主机回环地址监听 8089；内置 Redis 使用 16379，避免误连宿主机的默认 Redis；本地开发 Compose 不变。

**技术栈：** Docker Compose、Linux host networking、Nginx、Redis、Django 4.2

---

### 任务 1：生产容器改用宿主网络

**文件：**
- 修改：`docker-compose.yml`
- 修改：`spug_api/spug/settings.py`
- 创建：`docs/docker/nginx-host.conf`
- 创建：`docs/docker/redis-host.conf`
- 创建：`tests/test_host_network_config.py`
- 创建：`tests/test_host_network_config.sh`

- [x] **步骤 1：编写并运行失败的配置回归测试**

```bash
sh tests/test_host_network_config.sh
```

预期：修改前退出码 1，因为生产 Compose 尚未隔离 host 网络中的 Redis，且 Nginx 监听所有网卡。

- [x] **步骤 2：创建 host 网络服务配置**

Nginx 仅监听 `127.0.0.1:8089`，并移除基础镜像可变的 `conf.d` 配置加载。Redis 仍绑定回环地址，但使用专用端口 16379。

- [x] **步骤 3：修改生产 Compose 与 Django Redis 地址**

生产服务启用 `network_mode: host`，删除 `ports`，挂载两份 host 网络配置，并设置 `SPUG_REDIS_PORT=16379`。Django 缓存与 Channels 从环境变量读取 Redis 主机和端口，默认值仍保持 `127.0.0.1:6379`。

- [x] **步骤 4：验证回归测试、Python 语法与 Compose 解析**

```bash
sh tests/test_host_network_config.sh
python3 -m py_compile spug_api/spug/settings.py
SPUG_SECRET_KEY=test SPUG_DB_ENGINE=django.db.backends.postgresql SPUG_DB_NAME=spug SPUG_DB_USER=spug SPUG_DB_PASSWORD=test SPUG_DB_HOST=127.0.0.1 SPUG_DB_PORT=5432 docker compose config
```

预期：全部退出码 0。

- [ ] **步骤 5：Linux 部署前检查端口和数据库**

```bash
docker compose run --rm --no-deps --entrypoint sh spug -c \
  "cd /data/spug/spug_api && python3 manage.py shell -c \"from django.db import connection; cursor = connection.cursor(); cursor.execute('SELECT 1'); assert cursor.fetchone()[0] == 1; cursor.close()\""
docker compose stop
if ss -lntp | grep -Eq ':(8089|9001|9002|16379)\\b'; then
  echo 'host-network port conflict' >&2
  exit 1
fi
```

预期：使用实际生产环境变量时 `SELECT 1` 成功；停止旧容器后四个端口均未被其他服务占用。`SPUG_DB_HOST` 若是旧 Compose 服务名，须先改为 host 网络可路由地址。端口检查失败时先用原版本 Compose 恢复旧容器，不继续部署。

- [ ] **步骤 6：部署后运行时验证**

```bash
docker compose up -d --build --force-recreate
docker exec spug supervisorctl status
curl -fsS http://127.0.0.1:8089/ >/dev/null
docker exec spug bash -c \
  "timeout 3 bash -c 'exec 3<>/dev/tcp/127.0.0.1/22; head -c 4 <&3'" | grep -q SSH-
```

预期：Supervisor 所有进程为 RUNNING、Web 返回成功、Spug 容器内访问宿主机 SSH 能读取协议标识。若 SSH 使用非 22 端口，替换命令中的端口；最后在 Spug 主机管理中验证 `127.0.0.1` 主机。

### 回滚

更新代码前，在 Compose 所在目录保存旧配置、环境变量和 release 指向：

```bash
backup_dir="/opt/spug/deploy-backups/$(date +%Y%m%d%H%M%S)"
mkdir -p "$backup_dir"
cp docker-compose.yml "$backup_dir/docker-compose.yml"
cp .env "$backup_dir/.env"
readlink -f /opt/spug/releases/latest > "$backup_dir/release-target"
printf '%s\n' "$backup_dir"
```

记录命令输出的 `backup_dir`。需要回滚时，在 Compose 所在目录执行：

```bash
backup_dir=/opt/spug/deploy-backups/实际备份目录
cp "$backup_dir/docker-compose.yml" docker-compose.yml
cp "$backup_dir/.env" .env
ln -sfn "$(cat "$backup_dir/release-target")" /opt/spug/releases/latest
docker compose up -d --force-recreate
docker exec spug supervisorctl status
curl -fsS http://127.0.0.1:8089/ >/dev/null
```

旧 Compose 与旧 `.env` 成对恢复，因此桥接网络使用的原 `SPUG_DB_HOST` 也会恢复。用户将自行提交，本计划不执行 Git commit。
