# Spug 容器连接宿主机 SSH 设计

## 目标

生产环境中的 Spug 容器使用宿主机网络命名空间，使主机管理中配置
`127.0.0.1:<宿主机 SSH 端口>` 时能够连接宿主机 SSH 服务，同时保持 Web
入口为 `127.0.0.1:8089`。

## 方案

- 仅修改根目录生产 `docker-compose.yml`，为 `spug` 服务启用
  `network_mode: host`。
- host 网络不支持端口发布，因此删除 `ports`；保留
  `host.docker.internal` 映射以兼容已有外部配置。
- 新增生产 host 网络专用 Nginx 配置，仅监听宿主机回环地址的 `8089`；
  内部 API 与 WebSocket 服务仍通过 `127.0.0.1:9001` 和
  `127.0.0.1:9002` 访问。
- 新增生产 host 网络专用 Redis 配置，将容器内置 Redis 调整到 `16379`，
  并通过 `SPUG_REDIS_PORT` 让 Django 缓存与 Channels 使用同一端口，避免与
  宿主机已有的 `6379` 冲突。
- `docker-compose.local.yml` 保持桥接网络，避免改变 macOS 本地开发行为。

## 风险与约束

- 该生产部署方式仅适用于 Linux Docker Engine。
- 宿主机的 `8089`、`9001`、`9002`、`16379` 端口必须可用；应用内部服务会
  直接占用这些宿主机端口。
- 若 `SPUG_DB_HOST` 原来依赖 Docker Compose 服务名，需要改为 host 网络中可
  路由的地址；宿主机数据库可使用 `127.0.0.1`。
- Spug 容器已经是 `privileged`，host 网络会进一步扩大容器的网络访问范围，
  因此只应用于当前需要管理宿主机的生产实例。

## 验证

- 静态测试断言生产 Compose 使用 host 网络、没有 `ports`，保留兼容用的
  `extra_hosts`，且挂载的 Nginx 配置只监听 `127.0.0.1:8089`。
- 使用必需环境变量运行 `docker compose config` 验证配置可解析。
- 部署后在容器中检查 `127.0.0.1:<SSH 端口>` 返回 SSH banner，再在主机管理
  中执行连接验证。
