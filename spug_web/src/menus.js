export default [
  {icon: 'desktop', title: '工作台', path: '/home'},
  {icon: 'cloud-server', title: '主机管理', path: '/host'},
  {
    icon: 'deployment-unit', title: '批量执行', child: [
      {title: '执行任务', path: '/exec/task'},
      {title: '模板管理', path: '/exec/template'},
    ]
  },
  {icon: 'schedule', title: '任务计划', path: '/schedule'},
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
      {title: '系统设置', path: '/system/setting'},
    ]
  },
]