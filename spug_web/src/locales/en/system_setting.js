/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the AGPL-3.0 License.
 */
const dict = {
  // Menu / shared
  '首页': 'Home',
  '基本设置': 'Basic Settings',
  '安全设置': 'Security Settings',
  'LDAP设置': 'LDAP Settings',
  '密钥设置': 'SSH Key Settings',
  '报警服务设置': 'Alert Service Settings',
  '开放服务设置': 'Open Service Settings',
  '关于': 'About',
  '保存设置': 'Save Settings',
  '确认': 'Confirm',
  '设置成功': 'Saved successfully',

  // BasicSetting.js
  '请输入调用凭据': 'Please enter the service token',
  '调用凭据': 'Service Token',
  // The two entries below wrap around the "Spug" popover link, keep the leading/trailing spaces.
  '如需要使用Spug的邮件、微信和MFA等内置服务，请关注公众号': 'To use Spug\'s built-in services such as email, WeChat and MFA, follow the WeChat official account ',
  '在【我的】页面获取调用凭据，否则请留空。': ' and get the service token on its "Me" page, otherwise leave it blank.',
  '请输入Spug微信公众号获取到的Token': 'Token obtained from the Spug WeChat official account',

  // AlarmSetting.js
  '邮件服务连接成功': 'Email service connected successfully',
  '请完成邮件服务配置': 'Please complete the email service configuration',
  '邮件服务': 'Email Service',
  '用于通过邮件方式发送报警信息': 'Used to send alert notifications via email',
  '内置': 'Built-in',
  '自定义': 'Custom',
  '邮件服务器': 'SMTP Server',
  '例如：smtp.exmail.qq.com': 'e.g. smtp.exmail.qq.com',
  '例如：465': 'e.g. 465',
  '邮箱账号': 'Email Account',
  '例如：dev@exmail.com': 'e.g. dev@exmail.com',
  '密码/授权码': 'Password / Auth Code',
  '请输入对应的密码或授权码': 'Password or SMTP authorization code',
  '发件人昵称': 'Sender Name',
  '请输入发件人昵称': 'Sender display name',
  '测试邮件服务': 'Test Email Service',

  // KeySetting.js
  '密钥修改确认': 'Confirm key change',
  '请谨慎修改密钥对，修改密钥对可能会让现有的主机都无法进行验证，影响与主机相关的各项功能！': 'Be careful: changing the key pair may break authentication for all existing hosts and affect every host-related feature!',
  // The three entries below form one sentence around a highlighted span, keep the spaces.
  '修改密钥对需要': 'Changes to the key pair ',
  '重启服务后生效': 'take effect after the service is restarted',
  '，已添加的主机可能需要重新进行编辑验证后才可以正常连接。': ', and hosts already added may need to be edited and re-verified before they can connect again.',
  '在这里你可以上传并使用已有的密钥对，没有上传密钥的情况下，Spug会在首次添加主机时自动生成密钥对。': 'You can upload an existing key pair here. If none is uploaded, Spug will generate one automatically when the first host is added.',
  '公钥': 'Public Key',
  '一般位于 ~/.ssh/id_rsa.pub': 'Usually located at ~/.ssh/id_rsa.pub',
  '请输入公钥': 'Enter the public key',
  '私钥': 'Private Key',
  '一般位于 ~/.ssh/id_rsa': 'Usually located at ~/.ssh/id_rsa',
  '请输入私钥内容': 'Enter the private key content',

  // About.js
  '发现新版本 {}': 'New version {} available',
  '如何升级？': 'How to upgrade?',
  '已是最新版本': 'Already up to date',
  '知道了': 'Got it',
  '操作系统': 'Operating System',
  'Python版本': 'Python Version',
  'Django版本': 'Django Version',
  'Spug API版本': 'Spug API Version',
  'Spug Web版本': 'Spug Web Version',
  '官网文档': 'Documentation',
  '更新日志': 'Changelog',
  'Spug API版本与Web版本不匹配，请尝试刷新浏览器后再次查看。': 'The Spug API version does not match the web version. Try refreshing your browser and check again.',

  // OpenService.js
  '访问凭据': 'Access Token',
  '该自定义凭据用于访问平台的开放服务，例如：配置中心的配置获取API等，其他开放服务请查询官方文档。': 'This custom token is used to access the platform\'s open services, such as the configuration API of the Config Center. See the official documentation for other open services.',
  '请输入自定义凭证': 'Enter a custom token',

  // LdapImport.js
  '登录名': 'Login Name',
  '是否存在': 'Exists',
  'Ldap用户导入': 'Import LDAP Users',
  '导入选中': 'Import Selected',
  '导入全部': 'Import All',
  'LDAP用户列表': 'LDAP Users',
  '搜索LDAP用户': 'Search LDAP users',

  // LDAPSetting.js
  '成功匹配{}个用户': 'Matched {} users',
  'LDAP用户测试登录': 'Test LDAP User Login',
  'LDAP登录名': 'LDAP Login Name',
  'LDAP用户密码': 'LDAP User Password',
  '登录成功': 'Signed in successfully',
  'LDAP服务地址': 'LDAP Server Address',
  '例如：ldap://127.0.0.1:389': 'e.g. ldap://127.0.0.1:389',
  '绑定DN': 'Bind DN',
  '例如：cn=admin,dc=spug,dc=cc': 'e.g. cn=admin,dc=spug,dc=cc',
  'LDAP管理密码': 'LDAP admin password',
  '用户OU': 'User OU',
  '例如：ou=users,dc=spug,dc=cc': 'e.g. ou=users,dc=spug,dc=cc',
  '用户过滤器': 'User Filter',
  '例如：(cn或uid或sAMAccountName=%(user)s)': 'e.g. (cn=%(user)s), cn can also be uid or sAMAccountName',
  '登录名映射': 'Login Name Mapping',
  '登录名映射代表将LDAP用户的某个属性映射到Spug账户的登录名中，例如cn对应登录名': 'Which LDAP attribute is mapped to the Spug account login name, e.g. cn',
  '例如：cn': 'e.g. cn',
  '姓名映射': 'Name Mapping',
  '姓名映射代表将LDAP用户的某个属性映射到Spug账户的姓名中，例如sn对应姓名': 'Which LDAP attribute is mapped to the Spug account display name, e.g. sn',
  '例如：sn': 'e.g. sn',
  '测试连接': 'Test Connection',
  '测试登录': 'Test Login',
  '用户导入': 'Import Users',

  // SecuritySetting.js
  '开启MFA认证需要先在基本设置中配置调用凭据': 'Please configure the service token in Basic Settings before enabling MFA',
  '访问IP校验': 'Client IP Verification',
  // Followed inline by the "Why is the real IP not detected?" link, keep the trailing space.
  '建议开启，校验是否获取了真实的访问者IP，防止因为增加的反向代理层导致基于IP的安全策略失效，当校验失败时会在登录时弹窗提醒。如果你在内网部署且仅在内网使用可以关闭该特性。': 'Recommended. Verifies that the real client IP is obtained, so IP-based security policies are not defeated by an extra reverse proxy layer. A popup will warn you at login when the check fails. If Spug is deployed and used only on an internal network, you can turn this off. ',
  '为什么没有获取到真实IP？': 'Why is the real IP not detected?',
  '登录IP绑定': 'Login IP Binding',
  '强烈建议开启，当开启后会把登录凭证与IP进行绑定，当该登录凭证通过其他IP访问时将自动失效。如非必要，切勿关闭该特性！': 'Strongly recommended. When enabled, the login session is bound to the client IP and is invalidated automatically if used from another IP. Do not turn this off unless you really have to!',
  '登录MFA（两步）认证': 'Login MFA (Two-Step Verification)',
  '输入验证码，通过验证后开启。': 'Enter the verification code to turn it on.',
  // Followed inline by the "What is the WeChat Token?" link, keep the trailing space.
  '建议开启，登录时额外使用验证码进行身份验证。开启前至少要确保管理员账户配置了微信Token（账户管理/编辑），开启后未配置微信Token的账户将无法登录，': 'Recommended. Requires an extra verification code at login. Before enabling, make sure at least the administrator account has a WeChat Token configured (Accounts / Edit); once enabled, accounts without a WeChat Token cannot sign in. ',
  '什么是微信Token？': 'What is the WeChat Token?',
  '验证通过后开启MFA（两步验证）。': 'MFA (two-step verification) will be enabled once the code is verified.',
  '请输入验证码': 'Verification code',
  '{} 秒后重新获取': 'Resend in {} seconds',
  '获取验证码': 'Get Code',
};

export default dict;
