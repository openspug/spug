export default [
  {icon: 'desktop', title: '工作台', path: '/home'},
  {icon: 'cloud-server', title: '主机管理', path: '/host'},
  {
    icon: 'setting', title: '系统管理', child: [
      {title: '账户管理', path: '/system/account'},
      {title: '系统信息', path: '/system/info'},
    ]
  },
]