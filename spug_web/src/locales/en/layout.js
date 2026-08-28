/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the AGPL-3.0 License.
 */
const dict = {
  // Login page
  '灵活、强大、易用的开源运维平台': 'A flexible, powerful and easy-to-use open source DevOps platform',
  '普通登录': 'Password',
  'LDAP登录': 'LDAP',
  '请输入账户': 'Username',
  '请输入密码': 'Password',
  '请输入验证码': 'Verification code',
  '获取验证码': 'Send code',
  '{} 秒后重新获取': 'Resend in {}s',
  '登录': 'Sign in',
  '安全警告': 'Security warning',
  '未能获取到访问者的真实IP，无法提供基于请求来源IP的合法性验证，详细信息请参考':
    'Could not detect the real client IP, so IP-based access validation is unavailable. See the ',
  '官方文档': 'documentation',
  '官网': 'Website',
  '文档': 'Docs',
  '会话过期，请重新登录': 'Session expired, please sign in again',
  '无效的数据格式': 'Invalid response format',
  '请求失败: {}': 'Request failed: {}',
  '请求异常: {}': 'Request error: {}',

  // Layout / notifications
  '知道了': 'Got it',
  '全部 已读': 'Mark all as read',
  '检测到您在移动设备上访问，请使用横屏模式。': 'Mobile device detected, please use landscape mode.',
  '抱歉，你访问的页面不存在': 'Sorry, the page you visited does not exist',

  // Shared components
  '选择应用': 'Select App',
  '请输入快速检索应用': 'Search apps',
  '该环境下还没有可发布或构建的应用哦，快去': 'No deployable or buildable apps in this environment yet. Go to ',
  '应用管理': 'Deploy Configs',
  '创建应用发布配置吧。': ' and create one.',
  '输入检索': 'Search',
  '已选择': 'Selected',
  '项': 'item(s)',
  // backend notifications pushed over WebSocket (Chinese text is the key)
  '通知发送失败': 'Failed to send the notification',
  '发送报警信息失败': 'Failed to send the alert',
  '未配置报警服务调用凭据，请在系统管理/系统设置/基本设置/调用凭据中配置。': 'The alert service credential is not configured, please set it in System / System Settings / Basic Settings / API credential.',
  '未配置报警服务调用凭据，请在系统管理/系统设置/报警服务设置中配置。': 'The alert service credential is not configured, please set it in System / System Settings / Alert Service.',
  '未找到可用的通知对象，请确保设置了相关报警联系人的微信Token。': 'No available recipient, please make sure the alert contacts have a WeChat token configured.',
  '未找到可用的通知对象，请确保设置了相关报警联系人的钉钉。': 'No available recipient, please make sure the alert contacts have DingTalk configured.',
  '未找到可用的通知对象，请确保设置了相关报警联系人的邮件地址。': 'No available recipient, please make sure the alert contacts have an email address configured.',
  '未找到可用的通知对象，请确保设置了相关报警联系人的企业微信。': 'No available recipient, please make sure the alert contacts have WeChat Work configured.',
  '请检查监控、任务计划或批量执行等避免长耗时任务，必要时可重启服务清空队列。': 'Check monitoring, scheduled tasks and batch execution for long-running jobs, restart the service to drain the queue if necessary.',
};

export default dict;
