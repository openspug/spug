# Docker 项目新建与日志交互实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框跟踪进度。

**目标：** 在选定服务器后创建并立即启动 Docker 项目，并让容器日志按钮直接打开日志页签。

**架构：** 后端新增受 `docker.project.do` 权限保护的创建接口，校验项目名和绝对目录，将内容写入远程 `compose.yaml` 临时文件，通过 `docker compose config -q` 校验后原子落盘并执行 `up -d`。前端增加新建项目弹窗和受控 Tabs，创建成功后重新发现服务器项目并选中新项目。

**技术栈：** Django 4.2、Paramiko、Redis Lock、React 16、Ant Design 4、Docker Compose v2。

---

### 任务 1：远程项目创建

**文件：**
- 修改：`spug_api/apps/docker/client.py`
- 修改：`spug_api/apps/docker/views.py`
- 修改：`spug_api/apps/docker/urls.py`
- 测试：`spug_api/apps/docker/tests.py`

- [ ] 编写 `create_project` 的失败测试，验证安全命令、配置校验、原子写入和立即启动。
- [ ] 运行 `python3 manage.py test apps.docker.tests`，确认因接口缺失失败。
- [ ] 实现项目名、绝对工作目录和 1 MB 内容限制，远程创建目录并保存 `compose.yaml`。
- [ ] 使用项目级 Redis 锁调用创建逻辑，创建完成返回新项目引用。
- [ ] 重跑 Docker 后端测试并确认通过。

### 任务 2：新建项目表单与日志页签

**文件：**
- 创建：`spug_web/src/pages/docker/CreateProject.js`
- 修改：`spug_web/src/pages/docker/index.js`
- 修改：`spug_web/src/pages/docker/index.module.less`

- [ ] 添加“新建项目”按钮，仅选择服务器且拥有操作权限时可用。
- [ ] 表单收集项目名、绝对工作目录和 Compose 内容，提交创建接口。
- [ ] 创建成功后重新发现项目，并按项目名及配置路径选中新项目。
- [ ] 将 Tabs 改为受控状态；点击容器日志按钮先切换 `logs`，再请求对应服务日志。
- [ ] 将界面中的“Compose 项目”统一改为“项目”。

### 任务 3：验证

**文件：**
- 验证上述所有修改。

- [ ] 运行 Docker 与任务 AI 后端测试。
- [ ] 运行 Django `check` 和迁移一致性检查。
- [ ] 运行 React 生产构建。
- [ ] 通过本地登录会话验证发现接口，并确认新路由可解析。
- [ ] 执行 `git diff --check`。
