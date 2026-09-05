/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the AGPL-3.0 License.
 */
import { t } from 'libs';

export default [{
  key: 'dashboard',
  label: t('Dashboard'),
  pages: [{
    key: 'dashboard',
    label: t('Dashboard'),
    perms: [
      {key: 'view', label: t('查看Dashboard')}
    ]
  }]
}, {
  key: 'host',
  label: t('主机管理'),
  pages: [{
    key: 'host',
    label: t('主机管理'),
    perms: [
      {key: 'view', label: t('查看主机')},
      {key: 'add', label: t('新建主机')},
      {key: 'edit', label: t('编辑主机')},
      {key: 'del', label: t('删除主机')},
    ]
  }, {
    key: 'console',
    label: t('Web终端'),
    perms: [
      {key: 'view', label: t('Web终端')},
      {key: 'list', label: t('文件管理')},
      {key: 'upload', label: t('上传文件')},
      {key: 'del', label: t('删除文件')},
    ]
  }]
}, {
  key: 'docker',
  label: t('Docker 管理'),
  pages: [{
    key: 'project',
    label: t('项目'),
    perms: [
      {key: 'view', label: t('查看 Docker 项目')},
      {key: 'add', label: t('新建项目并启动')},
      {key: 'edit', label: t('编辑 Compose 配置')},
      {key: 'del', label: t('删除项目')},
      {key: 'do', label: t('发布和操作容器')},
    ]
  }]
}, {
  key: 'exec',
  label: t('批量执行'),
  pages: [{
    key: 'task',
    label: t('执行任务'),
    perms: [
      {key: 'do', label: t('执行任务')}
    ]
  }, {
    key: 'template',
    label: t('模板管理'),
    perms: [
      {key: 'view', label: t('查看模板')},
      {key: 'add', label: t('新建模板')},
      {key: 'edit', label: t('编辑模板')},
      {key: 'del', label: t('删除模板')},
    ]
  }, {
    key: 'transfer',
    label: t('文件分发'),
    perms: [
      {key: 'do', label: t('文件分发')}
    ]
  }]
}, {
  key: 'deploy',
  label: t('应用发布'),
  pages: [{
    key: 'app',
    label: t('应用管理'),
    perms: [
      {key: 'view', label: t('查看应用')},
      {key: 'add', label: t('新建应用')},
      {key: 'edit', label: t('编辑应用')},
      {key: 'del', label: t('删除应用')},
      {key: 'config', label: t('查看配置')},
    ]
  }, {
    key: 'repository',
    label: t('构建仓库'),
    perms: [
      {key: 'view', label: t('查看构建')},
      {key: 'add', label: t('新建版本')},
      {key: 'build', label: t('执行构建')},
      {key: 'del', label: t('删除版本')},
    ]
  },{
    key: 'request',
    label: t('发布申请'),
    perms: [
      {key: 'view', label: t('查看申请')},
      {key: 'add', label: t('新建申请')},
      {key: 'edit', label: t('编辑申请')},
      {key: 'del', label: t('删除申请')},
      {key: 'approve', label: t('审核申请')},
      {key: 'do', label: t('执行发布')}
    ]
  }]
}, {
  key: 'pipeline',
  label: t('流水线'),
  pages: [{
    key: 'pipeline',
    label: t('流水线'),
    perms: [
      {key: 'view', label: t('查看流水线')},
      {key: 'add', label: t('新建流水线')},
      {key: 'edit', label: t('编辑流水线')},
      {key: 'del', label: t('删除流水线')},
      {key: 'do', label: t('执行流水线')}
    ]
  }]
}, {
  key: 'schedule',
  label: t('任务计划'),
  pages: [{
    key: 'schedule',
    label: t('任务计划'),
    perms: [
      {key: 'view', label: t('查看任务')},
      {key: 'add', label: t('新建任务')},
      {key: 'edit', label: t('编辑任务')},
      {key: 'del', label: t('删除任务')},
    ]
  }]
}, {
  key: 'config',
  label: t('配置中心'),
  pages: [{
    key: 'env',
    label: t('环境管理'),
    perms: [
      {key: 'view', label: t('查看环境')},
      // {key: 'add', label: '新建环境'},
      {key: 'edit', label: t('编辑环境')},
      {key: 'del', label: t('删除环境')}
    ]
  }, {
    key: 'src',
    label: t('服务管理'),
    perms: [
      {key: 'view', label: t('查看服务')},
      {key: 'add', label: t('新建服务')},
      {key: 'edit', label: t('编辑服务')},
      {key: 'del', label: t('删除服务')},
      {key: 'view_config', label: t('查看配置')},
      {key: 'edit_config', label: t('修改配置')},
    ]
  }, {
    key: 'app',
    label: t('应用管理'),
    perms: [
      {key: 'view', label: t('查看应用')},
      // {key: 'add', label: '新建应用'},
      {key: 'edit', label: t('编辑应用')},
      {key: 'del', label: t('删除应用')},
      {key: 'view_config', label: t('查看配置')},
      {key: 'edit_config', label: t('修改配置')},
    ]
  }, {
    key: 'model',
    label: t('模型配置'),
    perms: [
      {key: 'view', label: t('查看模型')},
      {key: 'add', label: t('新建模型')},
      {key: 'edit', label: t('编辑模型')},
      {key: 'del', label: t('删除模型')},
    ]
  }]
}, {
  key: 'ai',
  label: t('智能体'),
  pages: [{
    key: 'agent',
    label: t('智能体'),
    perms: [
      {key: 'view', label: t('查看会话')},
      {key: 'do', label: t('发起会话')},
      {key: 'del', label: t('删除会话')},
    ]
  }, {
    key: 'mcp',
    label: t('MCP管理'),
    perms: [
      {key: 'view', label: t('查看MCP')},
      {key: 'add', label: t('新建MCP')},
      {key: 'edit', label: t('编辑MCP')},
      {key: 'del', label: t('删除MCP')},
    ]
  }, {
    key: 'skill',
    label: t('技能管理'),
    perms: [
      {key: 'view', label: t('查看技能')},
      {key: 'add', label: t('新建技能')},
      {key: 'edit', label: t('编辑技能')},
      {key: 'del', label: t('删除技能')},
    ]
  }]
}, {
  key: 'monitor',
  label: t('监控中心'),
  pages: [{
    key: 'monitor',
    label: t('监控中心'),
    perms: [
      {key: 'view', label: t('查看监控')},
      {key: 'add', label: t('新建监控')},
      {key: 'edit', label: t('编辑监控')},
      {key: 'del', label: t('删除监控')},
    ]
  }]
}, {
  key: 'database',
  label: t('数据库终端'),
  pages: [{
    key: 'connection',
    label: t('连接管理'),
    perms: [
      {key: 'view', label: t('查看数据库连接')},
      {key: 'add', label: t('新建数据库连接')},
      {key: 'edit', label: t('编辑数据库连接')},
      {key: 'del', label: t('删除数据库连接')},
    ]
  }, {
    key: 'query',
    label: t('命令执行'),
    perms: [
      {key: 'do', label: t('执行数据库命令')},
    ]
  }]
}, {
  key: 'alarm',
  label: t('报警中心'),
  pages: [{
    key: 'alarm',
    label: t('报警记录'),
    perms: [
      {key: 'view', label: t('查看记录')}
    ]
  }, {
    key: 'contact',
    label: t('报警联系人'),
    perms: [
      {key: 'view', label: t('查看联系人')},
      {key: 'add', label: t('新建联系人')},
      {key: 'edit', label: t('编辑联系人')},
      {key: 'del', label: t('删除联系人')},
    ]
  }, {
    key: 'group',
    label: t('报警联系组'),
    perms: [
      {key: 'view', label: t('查看联系组')},
      {key: 'add', label: t('新建联系组')},
      {key: 'edit', label: t('编辑联系组')},
      {key: 'del', label: t('删除联系组')},
    ]
  }]
}]
