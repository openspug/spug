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
    icon: 'setting', title: '系统管理', child: [
      {title: '账户管理', path: '/system/account'},
      {title: '系统信息', path: '/system/info'},
    ]
  },
]