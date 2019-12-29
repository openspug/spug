export default [
  {icon: 'desktop', title: '工作台', path: '/home'},
  {icon: 'cloud-server', title: '主机管理', path: '/host'},
  {
    icon: 'code', title: '批量执行', child: [
      {title: '执行任务', path: '/exec/task'},
      {title: '模板管理', path: '/exec/template'},
    ]
  },
  {
    icon: 'flag', title: '应用发布', child: [
      {title: '应用管理', path: '/deploy/app'},
      {title: '发布申请', path: '/deploy/request'},
    ]
  },
  {icon: 'schedule', title: '任务计划', path: '/schedule'},
  {
    icon: 'deployment-unit', title: '配置中心', child: [
      {title: '环境管理', path: '/config/environment'},
      {title: '服务配置', path: '/config/service'},
      {title: '应用配置', path: '/config/app'},
    ]
  },
  {icon: 'monitor', title: '监控中心', path: '/monitor'},
  {
    icon: 'alert', title: '报警中心', child: [
      {title: '报警历史', path: '/alarm/alarm'},
      {title: '报警联系人', path: '/alarm/contact'},
      {title: '报警联系组', path: '/alarm/group'},
    ]
  },
  {
    icon: 'setting', title: '系统管理', child: [
      {title: '账户管理', path: '/system/account'},
      {title: '角色管理', path: '/system/role'},
      {title: '系统设置', path: '/system/setting'},
    ]
  },
]