/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the MIT License.
 */
export default [
  {icon: 'desktop', title: '工作台', auth: 'home.home.view', path: '/home'},
  {icon: 'cloud-server', title: '主机管理', auth: 'host.host.view', path: '/host'},
  {
    icon: 'code', title: '批量执行', auth: 'exec.task.do|exec.template.view', child: [
      {title: '执行任务', auth: 'exec.task.do', path: '/exec/task'},
      {title: '模板管理', auth: 'exec.template.view', path: '/exec/template'},
    ]
  },
  {
    icon: 'flag', title: '应用发布', auth: 'deploy.app.view|deploy.request.view', child: [
      {title: '应用管理', auth: 'deploy.app.view', path: '/deploy/app'},
      {title: '发布申请', auth: 'deploy.request.view', path: '/deploy/request'},
    ]
  },
  {icon: 'schedule', title: '任务计划', auth: 'schedule.schedule.view', path: '/schedule'},
  {
    icon: 'deployment-unit', title: '配置中心', auth: 'config.env.view|config.src.view|config.app.view', child: [
      {title: '环境管理', auth: 'config.env.view', path: '/config/environment'},
      {title: '服务配置', auth: 'config.src.view', path: '/config/service'},
      {title: '应用配置', auth: 'config.app.view', path: '/config/app'},
    ]
  },
  {icon: 'monitor', title: '监控中心', auth: 'monitor.monitor.view', path: '/monitor'},
  {
    icon: 'alert', title: '报警中心', auth: 'alarm.alarm.view|alarm.contact.view|alarm.group.view', child: [
      {title: '报警历史', auth: 'alarm.alarm.view', path: '/alarm/alarm'},
      {title: '报警联系人', auth: 'alarm.contact.view', path: '/alarm/contact'},
      {title: '报警联系组', auth: 'alarm.group.view', path: '/alarm/group'},
    ]
  },
  {
    icon: 'setting', title: '系统管理', auth: "system.account.view|system.role.view|system.setting.view", child: [
      {title: '账户管理', auth: 'system.account.view', path: '/system/account'},
      {title: '角色管理', auth: 'system.role.view', path: '/system/role'},
      {title: '系统设置', auth: 'system.setting.view', path: '/system/setting'},
    ]
  },
]
