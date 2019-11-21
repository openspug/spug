export default [
  {icon: 'desktop', title: '工作台', path: '/home'},
  {icon: 'cloud-server', title: '主机管理', path: '/host'},
  {
    icon: 'deployment-unit', title: '批量执行', child: [
      {title: '执行模板', path: '/exec/template'},
    ]
  },
  {
    icon: 'setting', title: '系统管理', child: [
      {title: '账户管理', path: '/system/account'},
      {title: '系统信息', path: '/system/info'},
    ]
  },
]