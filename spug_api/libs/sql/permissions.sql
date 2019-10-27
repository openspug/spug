-- system role
INSERT INTO account_roles (id, name, `desc`) VALUES (1, '系统默认角色', '系统默认角色');

-- Dashboard
INSERT INTO account_permissions (id, name, `desc`) VALUES (100, 'home_view', 'Dashboard');

-- 用户管理 -> 用户列表
INSERT INTO account_permissions (id, name, `desc`) VALUES (101, 'account_user_view', '获取用户列表');
INSERT INTO account_permissions (id, name, `desc`) VALUES (102, 'account_user_add', '添加用户');
INSERT INTO account_permissions (id, name, `desc`) VALUES (103, 'account_user_edit', '编辑用户');
INSERT INTO account_permissions (id, name, `desc`) VALUES (104, 'account_user_del', '删除用户');
INSERT INTO account_permissions (id, name, `desc`) VALUES (105, 'account_user_disable', '禁用用户');

-- 用户管理 -> 角色权限
INSERT INTO account_permissions (id, name, `desc`) VALUES (201, 'account_role_view', '获取角色列表');
INSERT INTO account_permissions (id, name, `desc`) VALUES (202, 'account_role_add', '添加角色');
INSERT INTO account_permissions (id, name, `desc`) VALUES (203, 'account_role_edit', '编辑角色');
INSERT INTO account_permissions (id, name, `desc`) VALUES (204, 'account_role_del', '删除角色');
INSERT INTO account_permissions (id, name, `desc`) VALUES (205, 'account_role_permission_view', '查看角色权限');
INSERT INTO account_permissions (id, name, `desc`) VALUES (206, 'account_role_permission_edit', '修改角色权限');

-- 主机管理 -> 主机列表
INSERT INTO account_permissions (id, name, `desc`) VALUES (301, 'assets_host_view', '获取主机列表');
INSERT INTO account_permissions (id, name, `desc`) VALUES (302, 'assets_host_add', '添加主机');
INSERT INTO account_permissions (id, name, `desc`) VALUES (303, 'assets_host_edit', '编辑主机');
INSERT INTO account_permissions (id, name, `desc`) VALUES (304, 'assets_host_del', '删除主机');
INSERT INTO account_permissions (id, name, `desc`) VALUES (305, 'assets_host_valid', '验证主机');

-- 主机管理 -> 批量执行
INSERT INTO account_permissions (id, name, `desc`) VALUES (306, 'assets_host_exec_view', '批量执行视图');
INSERT INTO account_permissions (id, name, `desc`) VALUES (307, 'assets_host_exec', '批量执行权限');

-- 主机管理 -> 批量执行 --> 执行模板
INSERT INTO account_permissions (id, name, `desc`) VALUES (308, 'assets_host_exec_tpl_view', '批量执行模板列表');
INSERT INTO account_permissions (id, name, `desc`) VALUES (309, 'assets_host_exec_tpl_add', '添加模板');
INSERT INTO account_permissions (id, name, `desc`) VALUES (310, 'assets_host_exec_tpl_edit', '编辑模板');
INSERT INTO account_permissions (id, name, `desc`) VALUES (311, 'assets_host_exec_tpl_del', '删除模板');

-- 应用发布 -> 应用列表
INSERT INTO account_permissions (id, name, `desc`) VALUES (401, 'publish_app_view', '获取应用列表');
INSERT INTO account_permissions (id, name, `desc`) VALUES (402, 'publish_app_add', '添加应用');
INSERT INTO account_permissions (id, name, `desc`) VALUES (403, 'publish_app_edit', '编辑应用');
INSERT INTO account_permissions (id, name, `desc`) VALUES (404, 'publish_app_del', '删除应用');
INSERT INTO account_permissions (id, name, `desc`) VALUES (405, 'publish_app_publish_view', '应用发布');
INSERT INTO account_permissions (id, name, `desc`) VALUES (406, 'publish_app_ctr_view', '容器设置 - 查看');
INSERT INTO account_permissions (id, name, `desc`) VALUES (407, 'publish_app_ctr_edit', '容器设置 - 编辑');
INSERT INTO account_permissions (id, name, `desc`) VALUES (408, 'publish_app_var_view', '应用设置 - 查看');
INSERT INTO account_permissions (id, name, `desc`) VALUES (409, 'publish_app_var_add', '应用设置 - 添加');
INSERT INTO account_permissions (id, name, `desc`) VALUES (410, 'publish_app_var_edit', '应用设置 - 编辑');
INSERT INTO account_permissions (id, name, `desc`) VALUES (411, 'publish_app_var_del', '应用设置 - 删除');
INSERT INTO account_permissions (id, name, `desc`) VALUES (412, 'publish_app_menu_view', '菜单管理 - 查看');
INSERT INTO account_permissions (id, name, `desc`) VALUES (413, 'publish_app_menu_edit', '菜单管理 - 编辑');

-- 应用发布 -> 应用列表 -> 发布页面
INSERT INTO account_permissions (id, name, `desc`) VALUES (501, 'publish_app_publish_host_select', '选择发布主机');
INSERT INTO account_permissions (id, name, `desc`) VALUES (502, 'publish_app_publish_ctr_control', '启动|停止容器');
INSERT INTO account_permissions (id, name, `desc`) VALUES (503, 'publish_app_publish_ctr_del', '删除容器');
INSERT INTO account_permissions (id, name, `desc`) VALUES (504, 'publish_app_publish_deploy', '执行发布');
INSERT INTO account_permissions (id, name, `desc`) VALUES (505, 'publish_app_publish_menu_exec', '执行自定义菜单');

-- 应用发布 -> 镜像管理
INSERT INTO account_permissions (id, name, `desc`) VALUES (601, 'publish_image_view', '获取镜像列表');
INSERT INTO account_permissions (id, name, `desc`) VALUES (602, 'publish_image_sync', '执行镜像同步');
INSERT INTO account_permissions (id, name, `desc`) VALUES (603, 'publish_image_edit', '镜像编辑');
INSERT INTO account_permissions (id, name, `desc`) VALUES (604, 'publish_image_del', '镜像删除');
INSERT INTO account_permissions (id, name, `desc`) VALUES (605, 'publish_image_var_view', '镜像设置 - 查看');
INSERT INTO account_permissions (id, name, `desc`) VALUES (606, 'publish_image_var_add', '镜像设置 - 添加');
INSERT INTO account_permissions (id, name, `desc`) VALUES (607, 'publish_image_var_edit', '镜像设置 - 编辑');
INSERT INTO account_permissions (id, name, `desc`) VALUES (608, 'publish_image_var_del', '镜像设置 - 删除');


-- 配置管理 -> 环境管理
INSERT INTO account_permissions (id, name, `desc`) VALUES (701, 'config_environment_view', '获取环境列表');
INSERT INTO account_permissions (id, name, `desc`) VALUES (702, 'config_environment_add', '添加环境');
INSERT INTO account_permissions (id, name, `desc`) VALUES (703, 'config_environment_edit', '编辑环境');
INSERT INTO account_permissions (id, name, `desc`) VALUES (704, 'config_environment_del', '删除环境');

-- 配置管理 -> 服务配置
INSERT INTO account_permissions (id, name, `desc`) VALUES (801, 'config_service_view', '获取服务列表');
INSERT INTO account_permissions (id, name, `desc`) VALUES (802, 'config_service_add', '添加服务');
INSERT INTO account_permissions (id, name, `desc`) VALUES (803, 'config_service_edit', '编辑服务');
INSERT INTO account_permissions (id, name, `desc`) VALUES (804, 'config_service_del', '删除服务');
INSERT INTO account_permissions (id, name, `desc`) VALUES (805, 'config_service_cfg_view', '服务配置 - 查看');
INSERT INTO account_permissions (id, name, `desc`) VALUES (806, 'config_service_cfg_add', '服务配置 - 添加');
INSERT INTO account_permissions (id, name, `desc`) VALUES (807, 'config_service_cfg_edit', '服务配置 - 编辑');
INSERT INTO account_permissions (id, name, `desc`) VALUES (808, 'config_service_cfg_del', '服务配置 - 删除');

-- 配置管理 -> 应用配置
INSERT INTO account_permissions (id, name, `desc`) VALUES (901, 'config_app_view', '获取应用列表');
INSERT INTO account_permissions (id, name, `desc`) VALUES (902, 'config_app_cfg_view', '应用配置 - 查看');
INSERT INTO account_permissions (id, name, `desc`) VALUES (903, 'config_app_cfg_add', '应用配置 - 添加');
INSERT INTO account_permissions (id, name, `desc`) VALUES (904, 'config_app_cfg_edit', '应用配置 - 编辑');
INSERT INTO account_permissions (id, name, `desc`) VALUES (905, 'config_app_cfg_del', '应用配置 - 删除');
INSERT INTO account_permissions (id, name, `desc`) VALUES (906, 'config_app_rel_view', '应用关系 - 查看');
INSERT INTO account_permissions (id, name, `desc`) VALUES (907, 'config_app_rel_edit', '应用关系 - 编辑');

-- 任务管理 -> 任务列表
INSERT INTO account_permissions (id, name, `desc`) VALUES (1001, 'job_task_view', '获取任务列表');
INSERT INTO account_permissions (id, name, `desc`) VALUES (1002, 'job_task_add', '添加任务');
INSERT INTO account_permissions (id, name, `desc`) VALUES (1003, 'job_task_edit', '编辑任务');
INSERT INTO account_permissions (id, name, `desc`) VALUES (1004, 'job_task_del', '删除任务');
INSERT INTO account_permissions (id, name, `desc`) VALUES (1005, 'job_task_log', '任务日志');

-- 应用发布 -> 菜单管理
INSERT INTO account_permissions (id, name, `desc`) VALUES (1101, 'publish_menu_view', '自定义菜单 - 查看');
INSERT INTO account_permissions (id, name, `desc`) VALUES (1102, 'publish_menu_add', '自定义菜单 - 添加');
INSERT INTO account_permissions (id, name, `desc`) VALUES (1103, 'publish_menu_edit', '自定义菜单 - 编辑');
INSERT INTO account_permissions (id, name, `desc`) VALUES (1104, 'publish_menu_del', '自定义菜单 - 删除');
INSERT INTO account_permissions (id, name, `desc`) VALUES (1105, 'publish_menu_rel_view', '关联配置 - 查看');
INSERT INTO account_permissions (id, name, `desc`) VALUES (1106, 'publish_menu_rel_edit', '关联配置 - 编辑');

-- 应用发布 -> 字段管理
INSERT INTO account_permissions (id, name, `desc`) VALUES (1201, 'publish_field_view', '自定义字段 - 查看');
INSERT INTO account_permissions (id, name, `desc`) VALUES (1202, 'publish_field_add', '自定义字段 - 添加');
INSERT INTO account_permissions (id, name, `desc`) VALUES (1203, 'publish_field_edit', '自定义字段 - 编辑');
INSERT INTO account_permissions (id, name, `desc`) VALUES (1204, 'publish_field_del', '自定义字段 - 删除');
INSERT INTO account_permissions (id, name, `desc`) VALUES (1205, 'publish_field_rel_view', '关联配置 - 查看');
INSERT INTO account_permissions (id, name, `desc`) VALUES (1206, 'publish_field_rel_edit', '关联配置 - 编辑');

-- 系统管理 -> 通知设置
INSERT INTO account_permissions (id, name, `desc`) VALUES (1301, 'system_notify_view', '系统通知列表');
INSERT INTO account_permissions (id, name, `desc`) VALUES (1302, 'system_notify_add', '添加通知设置');
INSERT INTO account_permissions (id, name, `desc`) VALUES (1303, 'system_notify_edit', '编辑通知设置');
INSERT INTO account_permissions (id, name, `desc`) VALUES (1304, 'system_notify_del', '删除通知设置');
