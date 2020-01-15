/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the MIT License.
 */
export default [{
  key: 'home',
  label: '工作台',
  pages: [{
    key: 'home',
    label: '工作台',
    perms: [
      {key: 'view', label: '查看工作台'}
    ]
  }]
}, {
  key: 'host',
  label: '主机管理',
  pages: [{
    key: 'host',
    label: '主机管理',
    perms: [
      {key: 'view', label: '查看主机'},
      {key: 'add', label: '新建主机'},
      {key: 'edit', label: '编辑主机'},
      {key: 'del', label: '删除主机'},
      {key: 'console', label: 'Console'},
    ]
  }]
}, {
  key: 'exec',
  label: '批量执行',
  pages: [{
    key: 'task',
    label: '执行任务',
    perms: [
      {key: 'do', label: '执行任务'}
    ]
  }, {
    key: 'template',
    label: '模板管理',
    perms: [
      {key: 'view', label: '查看模板'},
      {key: 'add', label: '新建模板'},
      {key: 'edit', label: '编辑模板'},
      {key: 'del', label: '删除模板'},
    ]
  }]
}, {
  key: 'deploy',
  label: '应用发布',
  pages: [{
    key: 'app',
    label: '应用管理',
    perms: [
      {key: 'view', label: '查看应用'},
      {key: 'add', label: '新建应用'},
      {key: 'edit', label: '编辑应用'},
      {key: 'del', label: '删除应用'},
    ]
  }, {
    key: 'request',
    label: '发布申请',
    perms: [
      {key: 'view', label: '查看申请'},
      {key: 'add', label: '新建申请'},
      {key: 'edit', label: '编辑申请'},
      {key: 'del', label: '删除申请'},
      {key: 'approve', label: '审核申请'},
      {key: 'do', label: '执行发布'}
    ]
  }]
}, {
  key: 'schedule',
  label: '任务计划',
  pages: [{
    key: 'schedule',
    label: '任务计划',
    perms: [
      {key: 'view', label: '查看任务'},
      {key: 'add', label: '新建任务'},
      {key: 'edit', label: '编辑任务'},
      {key: 'del', label: '删除任务'},
    ]
  }]
}, {
  key: 'config',
  label: '配置中心',
  pages: [{
    key: 'env',
    label: '环境管理',
    perms: [
      {key: 'view', label: '查看环境'},
      {key: 'add', label: '新建环境'},
      {key: 'edit', label: '编辑环境'},
      {key: 'del', label: '删除环境'}
    ]
  }, {
    key: 'src',
    label: '服务管理',
    perms: [
      {key: 'view', label: '查看服务'},
      {key: 'add', label: '新建服务'},
      {key: 'edit', label: '编辑服务'},
      {key: 'del', label: '删除服务'},
      {key: 'view_config', label: '查看配置'},
      {key: 'edit_config', label: '修改配置'},
    ]
  }, {
    key: 'app',
    label: '应用管理',
    perms: [
      {key: 'view', label: '查看应用'},
      {key: 'add', label: '新建应用'},
      {key: 'edit', label: '编辑应用'},
      {key: 'del', label: '删除应用'},
      {key: 'view_config', label: '查看配置'},
      {key: 'edit_config', label: '修改配置'},
    ]
  }]
}, {
  key: 'monitor',
  label: '监控中心',
  pages: [{
    key: 'monitor',
    label: '监控中心',
    perms: [
      {key: 'view', label: '查看监控'},
      {key: 'add', label: '新建监控'},
      {key: 'edit', label: '编辑监控'},
      {key: 'del', label: '删除监控'},
    ]
  }]
}, {
  key: 'alarm',
  label: '报警中心',
  pages: [{
    key: 'alarm',
    label: '报警记录',
    perms: [
      {key: 'view', label: '查看记录'}
    ]
  }, {
    key: 'contact',
    label: '报警联系人',
    perms: [
      {key: 'view', label: '查看联系人'},
      {key: 'add', label: '新建联系人'},
      {key: 'edit', label: '编辑联系人'},
      {key: 'del', label: '删除联系人'},
    ]
  }, {
    key: 'group',
    label: '报警联系组',
    perms: [
      {key: 'view', label: '查看联系组'},
      {key: 'add', label: '新建联系组'},
      {key: 'edit', label: '编辑联系组'},
      {key: 'del', label: '删除联系组'},
    ]
  }]
}]
