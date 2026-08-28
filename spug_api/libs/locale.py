# Copyright: (c) OpenSpug Organization. https://github.com/openspug/spug
# Copyright: (c) <spug.dev@gmail.com>
# Released under the AGPL-3.0 License.
# English translations for user-facing backend messages, keyed by the original
# Chinese text. Used by the response middleware when the client requests English.

MESSAGES = {
    'LDAP密码不能为空': 'LDAP password is required',
    'LDAP服务未配置': 'LDAP service is not configured',
    'LDAP用户不能为空': 'LDAP user is required',
    'LDAP账户无法修改密码': 'The password of an LDAP account cannot be changed here',
    'ldap账户无法删除，请使用禁用功能来禁止该账户访问系统': 'LDAP accounts cannot be deleted, please use the disable function to block this account from accessing the system',
    '不支持的报警方式': 'Unsupported alert method',
    '不能选择本分组的主机': 'Hosts of this group cannot be selected',
    '任务计划中的任务【{task.name}】关联了该主机，请解除关联后再尝试删除该主机': 'The scheduled task "{task.name}" references this host, please remove the association before deleting the host',
    '共享凭据无权修改': 'You are not allowed to modify a shared credential',
    '原密码错误，请重新输入': 'The current password is incorrect, please try again',
    '参数错误': 'Invalid parameters',
    '唯一标识符 {form.key} 已存在，请更改后重试': 'The identifier {form.key} already exists, please choose another one',
    '已关联发布申请无法删除': 'Cannot delete because it is referenced by deploy requests',
    '已启用登录双重认证，但您的账户未配置微信Token，请联系管理员': 'Two-factor authentication is enabled, but your account has no WeChat token configured, please contact the administrator',
    '已存在关联的发布记录，请删除关联的发布记录后再尝试删除发布配置': 'There are deploy records associated with it, please delete them before deleting the deploy configuration',
    '已存在登录名为【{form.username}】的用户': 'A user with the login name "{form.username}" already exists',
    '已存在的主机名称【{form.name}】': 'The host name "{form.name}" already exists',
    '已有用户使用了该角色，请解除关联后再尝试删除': 'This role is assigned to some users, please unassign them before deleting it',
    '应用【{deploy.app_name}】在【{deploy.env_name}】的发布配置关联了该主机，请解除关联后再尝试删除该主机': 'The deploy configuration of app "{deploy.app_name}" in environment "{deploy.env_name}" references this host, please remove the association before deleting the host',
    '应用在该环境下已经存在发布配置': 'The app already has a deploy configuration in this environment',
    '执行动作': 'Action to perform',
    '执行模板【{tpl.name}】关联了该主机，请解除关联后再尝试删除该主机': 'The execution template "{tpl.name}" references this host, please remove the association before deleting the host',
    '报警方式 微信、短信、邮件需要配置调用凭据（系统设置/基本设置），请配置后再启用该报警方式。': 'WeChat, SMS and email alerts require an API credential (System Settings / Basic Settings), please configure it before enabling this alert method.',
    '报警联系组【{group.name}】包含此联系人，请解除关联后再尝试删除该联系人': 'The alert contact group "{group.name}" contains this contact, please remove it from the group before deleting the contact',
    '数据源路径必须为该主机上已存在的目录': 'The data source path must be an existing directory on the host',
    '无效的执行规则，请更正后再试': 'Invalid execution rule, please correct it and try again',
    '无权访问主机，请联系管理员': 'No permission to access this host, please contact the administrator',
    '无法删除当前登录账户': 'Cannot delete the currently signed-in account',
    '是否是超级用户（默认否）': 'Whether to create a superuser (default no)',
    '未找到关联进程': 'No related process found',
    '未找到指定主机': 'The specified host does not exist',
    '未找到指定任务': 'The specified task does not exist',
    '未找到指定分组': 'The specified group does not exist',
    '未找到指定发布申请': 'The specified deploy request does not exist',
    '未找到指定发布配置': 'The specified deploy configuration does not exist',
    '未找到指定对象': 'The specified object does not exist',
    '未找到指定应用': 'The specified app does not exist',
    '未找到指定构建记录': 'The specified build record does not exist',
    '未找到指定流程': 'The specified pipeline does not exist',
    '未找到指定环境': 'The specified environment does not exist',
    '未找到指定申请': 'The specified request does not exist',
    '未找到指定角色': 'The specified role does not exist',
    '未找到指定记录': 'The specified record does not exist',
    '未找到该发布配置': 'The deploy configuration does not exist',
    '未指定操作对象': 'No operation target specified',
    '未配置调用凭据（系统设置/基本设置），请配置后再尝试。': 'API credential is not configured (System Settings / Basic Settings), please configure it and try again.',
    '权限拒绝': 'Permission denied',
    '标识符必须为字母、数字和下划线的组合': 'The identifier can only contain letters, numbers and underscores',
    '检测到当前账户未配置微信Token，请配置后再尝试启用MFA认证，否则可能造成系统无法正常登录。': 'Your account has no WeChat token configured, please configure it before enabling MFA, otherwise you may be locked out of the system.',
    '用户名或密码错误，连续多次错误账户将会被禁用': 'Incorrect username or password, the account will be disabled after too many consecutive failures',
    '监控中心的任务【{detection.name}】关联了该主机，请解除关联后再尝试删除该主机': 'The monitor task "{detection.name}" references this host, please remove the association before deleting the host',
    '监控任务【{detection.name}】正在使用该报警组，请解除关联后再尝试删除该联系组': 'The monitor task "{detection.name}" is using this alert group, please remove the association before deleting the contact group',
    '目前暂不支持短信告警，请关注后续更新。': 'SMS alerts are not supported yet, stay tuned for future updates.',
    '缺少必要参数': 'Missing required parameters',
    '缺少必要的参数': 'Missing required parameters',
    '解析配置{line!r}失败，确认其遵循 key = value 格式': 'Failed to parse configuration {line!r}, make sure it follows the key = value format',
    '设置值': 'Value to set',
    '设置对象': 'Target to set',
    '该主机还未验证': 'This host has not been verified yet',
    '该任务在运行中，请先停止任务再尝试删除': 'The task is running, please stop it before deleting',
    '该应用不支持此操作': 'This operation is not supported for this app',
    '该应用在应用发布中已存在关联的发布配置，请删除相关发布配置后再尝试删除': 'This app has deploy configurations in Deploy, please delete them before deleting the app',
    '该应用的发布配置中使用了数据传输动作且设置为发布时上传，请上传要传输的数据': 'The deploy configuration of this app uses a data transfer action set to upload at deploy time, please upload the data to be transferred',
    '该服务在配置中心已被 "{", ".join(rel_apps)}" 依赖，请解除依赖关系后再尝试删除。': 'This service is depended on by "{", ".join(rel_apps)}" in the configuration center, please remove the dependency before deleting it.',
    '该标识符已存在，请更改后重试': 'This identifier already exists, please choose another one',
    '该标识符已被应用 {app.name} 使用，请更改后重试': 'This identifier is already used by app {app.name}, please choose another one',
    '该标识符已被服务 {service.name} 使用，请更改后重试': 'This identifier is already used by service {service.name}, please choose another one',
    '该环境关联了构建记录，请在删除应用发布/构建仓库中相关记录后再尝试': 'This environment is referenced by build records, please delete the related records in Deploy / Build Repository first',
    '该环境已关联了发布配置，请删除相关发布配置后再尝试删除': 'This environment is referenced by deploy configurations, please remove them first',
    '该申请单当前状态还不能执行发布': 'This deploy request cannot be deployed in its current state',
    '该申请当前状态不允许审核': 'This request cannot be reviewed in its current state',
    '该监控项正在运行中，请先停止后再尝试删除': 'This monitor item is running, please stop it before deleting',
    '该识符已存在，请更改后重试': 'This identifier already exists, please choose another one',
    '请上传导航logo': 'Please upload the navigation logo',
    '请在系统设置中配置LDAP后再尝试通过该方式登录': 'Please configure LDAP in System Settings before signing in with this method',
    '请指定操作对象': 'Please specify the operation target',
    '请添加内网IP': 'Please add a private IP',
    '请添加磁盘': 'Please add a disk',
    '请移除分组下的主机后再尝试删除': 'Please remove the hosts in this group before deleting it',
    '请移除子分组后再尝试删除': 'Please remove the subgroups before deleting it',
    '请至少保留一个分组': 'Please keep at least one group',
    '请至少设置一个执行的动作': 'Please set at least one action',
    '请设置导航链接': 'Please set the navigation link',
    '请设置至少8位包含数字、小写和大写字母的新密码': 'Please set a new password with at least 8 characters including numbers, lowercase and uppercase letters',
    '请输主机名称': 'Please enter the host name',
    '请输入AccessKey ID': 'Please enter the AccessKey ID',
    '请输入AccessKey Secret': 'Please enter the AccessKey Secret',
    '请输入CPU核心数': 'Please enter the number of CPU cores',
    '请输入Key': 'Please enter the key',
    '请输入SSH端口': 'Please enter the SSH port',
    '请输入git仓库地址': 'Please enter the git repository URL',
    '请输入主机名或IP': 'Please enter the hostname or IP',
    '请输入任务内容': 'Please enter the task content',
    '请输入任务名称': 'Please enter the task name',
    '请输入任务类型': 'Please enter the task type',
    '请输入内存大小': 'Please enter the memory size',
    '请输入内容': 'Please enter the content',
    '请输入凭据名称': 'Please enter the credential name',
    '请输入分组名称': 'Please enter the group name',
    '请输入发布保留版本数量': 'Please enter the number of deploy versions to keep',
    '请输入发布存储路径': 'Please enter the deploy storage path',
    '请输入发布部署路径': 'Please enter the deploy target path',
    '请输入唯一标识符': 'Please enter a unique identifier',
    '请输入姓名': 'Please enter the name',
    '请输入密码': 'Please enter the password',
    '请输入密码/密钥': 'Please enter the password/private key',
    '请输入密码/授权码': 'Please enter the password/authorization code',
    '请输入导航描述': 'Please enter the navigation description',
    '请输入导航标题': 'Please enter the navigation title',
    '请输入执行动作': 'Please enter the actions to execute',
    '请输入执行命令内容': 'Please enter the command to execute',
    '请输入操作系统': 'Please enter the operating system',
    '请输入文件路径': 'Please enter the file path',
    '请输入昵称': 'Please enter the nickname',
    '请输入服务名称': 'Please enter the service name',
    '请输入构建版本': 'Please enter the build version',
    '请输入标题': 'Please enter the title',
    '请输入模版内容': 'Please enter the template content',
    '请输入模版名称': 'Please enter the template name',
    '请输入正确的保留数量': 'Please enter a valid number of versions to keep',
    '请输入正确的数据源路径': 'Please enter a valid data source path',
    '请输入流程名称': 'Please enter the pipeline name',
    '请输入环境名称': 'Please enter the environment name',
    '请输入用户名': 'Please enter the username',
    '请输入申请标题': 'Please enter the request title',
    '请输入登录名': 'Please enter the login name',
    '请输入登录用户名': 'Please enter the login username',
    '请输入监控地址': 'Please enter the monitor target address',
    '请输入目标路径': 'Please enter the target path',
    '请输入组名': 'Please enter the group name',
    '请输入联系人姓名': 'Please enter the contact name',
    '请输入角色名称': 'Please enter the role name',
    '请输入触发器参数': 'Please enter the trigger arguments',
    '请输入邮件服务地址': 'Please enter the mail server address',
    '请输入邮件服务端口号': 'Please enter the mail server port',
    '请输入邮箱账号': 'Please enter the email account',
    '请输入驳回原因': 'Please enter the rejection reason',
    '请输入验证码': 'Please enter the verification code',
    '请输入默认SSH用户名': 'Please enter the default SSH username',
    '请输入默认SSH端口号': 'Please enter the default SSH port',
    '请输申请标题': 'Please enter the request title',
    '请选择主机': 'Please select a host',
    '请选择主机分组': 'Please select a host group',
    '请选择任务分组': 'Please select a task group',
    '请选择凭据类型': 'Please select the credential type',
    '请选择分组': 'Please select a group',
    '请选择区域': 'Please select a region',
    '请选择发布版本': 'Please select the version to deploy',
    '请选择发布类型': 'Please select the deploy type',
    '请选择发布结果通知方式': 'Please select the deploy result notification method',
    '请选择应用': 'Please select an app',
    '请选择执行主机': 'Please select the hosts to execute on',
    '请选择执行失败通知方式': 'Please select the failure notification method',
    '请选择执行对象': 'Please select the execution targets',
    '请选择执行解释器': 'Please select the interpreter',
    '请选择报警方式': 'Please select the alert method',
    '请选择报警联系组': 'Please select the alert contact group',
    '请选择模版类型': 'Please select the template type',
    '请选择灰度发布的主机': 'Please select the hosts for canary release',
    '请选择环境': 'Please select an environment',
    '请选择监控类型': 'Please select the monitor type',
    '请选择目标主机': 'Please select the target hosts',
    '请选择联系人': 'Please select a contact',
    '请选择要上传的文件': 'Please select the file to upload',
    '请选择要发布的分支及Commit ID': 'Please select the branch and commit ID to deploy',
    '请选择要发布的版本': 'Please select the version to deploy',
    '请选择要回滚的版本': 'Please select the version to roll back to',
    '请选择要部署的主机': 'Please select the hosts to deploy',
    '请选择触发器类型': 'Please select the trigger type',
    '请选择连接地址': 'Please select the connection address',
    '账户名称': 'Account name',
    '账户密码': 'Account password',
    '账户已被系统禁用': 'This account has been disabled',
    '账户昵称': 'Account nickname',
    '账户角色【{role.name}】的主机权限关联该分组，请解除关联后再尝试删除': 'The host permission of role "{role.name}" references this group, please remove the association before deleting it',
    '选择的版本超出了发布配置中设置的版本数量，无法快速回滚，可通过新建发布申请选择构建仓库里的该版本再次发布。': 'The selected version is beyond the number of versions kept in the deploy configuration and cannot be quickly rolled back, you can create a new deploy request and pick this version from the build repository to deploy it again.',
    '验证失败，请重新登录': 'Verification failed, please sign in again',
    '验证码已失效，请重新获取': 'The verification code has expired, please request a new one',
    '验证码错误': 'Incorrect verification code',
    # host export column headers
    '主机名称': 'Host name',
    'SSH地址': 'SSH address',
    'SSH端口': 'SSH port',
    'SSH用户': 'SSH user',
    'SSH密码': 'SSH password',
    '备注信息': 'Description',
    '实例ID': 'Instance ID',
    '操作系统': 'OS',
    'CPU核心数': 'CPU cores',
    '内存GB': 'Memory (GB)',
    '磁盘GB': 'Disk (GB)',
    '内网IP': 'Private IP',
    '公网IP': 'Public IP',
    '实例计费方式': 'Instance billing',
    '网络计费方式': 'Network billing',
    '创建时间': 'Created at',
    '到期时间': 'Expires at',
    # realtime console output (deploy / build / pipeline / batch execution)
    '数据准备...': 'Preparing data...',
    '发布前任务...': 'Pre-deploy tasks...',
    '发布后任务...': 'Post-deploy tasks...',
    '执行发布...': 'Deploying...',
    '终止发布': 'Deployment aborted',
    '串行模式，终止发布': 'Serial mode, deployment aborted',
    '完成√': 'Done √',
    '跳过√': 'Skipped √',
    '未找到上传的文件信息，请尝试新建发布申请': 'No uploaded file found, please create a new deploy request',
    '检测到来源为本地路径的数据传输动作，执行打包...': 'Found a data transfer action with a local source, packaging...',
    '打包完成': 'Packaging completed',
    '构建准备...': 'Preparing build...',
    '检出前任务...': 'Pre-checkout tasks...',
    '检出后任务...': 'Post-checkout tasks...',
    '执行检出...': 'Checking out...',
    '执行打包...': 'Packaging...',
    '解析参数配置': 'Parsing parameters',
    '动态参数：': 'Dynamic parameters:',
    '静态参数：': 'Static parameters:',
    '参数解析完成': 'Parameters parsed',
    '同步并检出Git仓库': 'Syncing and checking out the Git repository',
    '执行构建命令': 'Running build commands',
    '构建完成': 'Build completed',
    '开始执行': 'Running',
    '执行结束': 'Finished',
    '开始传输数据': 'Transferring data',
    '传输完成': 'Transfer completed',
    '未找到上传的文件': 'The uploaded file was not found',
    '未指定要构建的Git标签': 'No Git tag specified for the build',
    '未配置要构建的Git分支': 'No Git branch configured for the build',
    '未配置 Webhook 地址': 'No webhook URL configured',
    '未选择推送对象': 'No push recipient selected',
    '未绑定推送助手账户，请在 系统管理/系统设置/推送服务设置 中完成绑定': 'No Spug Push account bound, please bind it in System / System Settings / Push Service',
    '检测到该主机未安装rsync，可通过批量执行/执行任务模块进行以下命令批量安装': 'rsync is not installed on this host, you can install it in batch via Batch Execution / Run Task with the commands below',
    # host connectivity verification (raised as exceptions)
    '上传的独立密钥认证失败，请检查该密钥是否能正常连接主机（推荐使用全局密钥）': 'Authentication with the uploaded private key failed, please make sure the key can connect to the host (using the global key is recommended)',
    '该主机不支持密码认证，请参考官方文档，错误代码：E00': 'The host does not support password authentication, please refer to the documentation, error code: E00',
    '该主机不支持密钥认证，请参考官方文档，错误代码：E01': 'The host does not support public key authentication, please refer to the documentation, error code: E01',
    '密钥认证失败，请参考官方文档，错误代码：E02': 'Public key authentication failed, please refer to the documentation, error code: E02',
    '密码连接认证失败，请检查密码是否正确': 'Password authentication failed, please check whether the password is correct',
    '连接主机超时，请检查网络': 'Connecting to the host timed out, please check the network',
    # ldap / setting
    '账户未找到': 'Account not found',
    '请先配置推送服务绑定账户': 'Please configure the bound account of the push service first',
    # monitor check results
    '端口状态检测正常': 'Port check passed',
    'Ping检测正常': 'Ping check passed',
    'Ping检测失败': 'Ping check failed',
    '检测状态正常': 'Check passed',
}

import re

_PATTERNS = [
    (re.compile(r'^任务计划中的任务【(.*?)】关联了该主机，请解除关联后再尝试删除该主机$', re.S),
     'The scheduled task "{0}" references this host, please remove the association before deleting the host'),
    (re.compile(r'^执行模板【(.*?)】关联了该主机，请解除关联后再尝试删除该主机$', re.S),
     'The execution template "{0}" references this host, please remove the association before deleting the host'),
    (re.compile(r'^监控中心的任务【(.*?)】关联了该主机，请解除关联后再尝试删除该主机$', re.S),
     'The monitor task "{0}" references this host, please remove the association before deleting the host'),
    (re.compile(r'^应用【(.*?)】在【(.*?)】的发布配置关联了该主机，请解除关联后再尝试删除该主机$', re.S),
     'The deploy configuration of app "{0}" in environment "{1}" references this host, please remove the association before deleting the host'),
    (re.compile(r'^已存在的主机名称【(.*?)】$', re.S),
     'The host name "{0}" already exists'),
    (re.compile(r'^已存在登录名为【(.*?)】的用户$', re.S),
     'A user with the login name "{0}" already exists'),
    (re.compile(r'^账户角色【(.*?)】的主机权限关联该分组，请解除关联后再尝试删除$', re.S),
     'The host permission of role "{0}" references this group, please remove the association before deleting it'),
    (re.compile(r'^监控任务【(.*?)】正在使用该报警组，请解除关联后再尝试删除该联系组$', re.S),
     'The monitor task "{0}" is using this alert group, please remove the association before deleting the contact group'),
    (re.compile(r'^报警联系组【(.*?)】包含此联系人，请解除关联后再尝试删除该联系人$', re.S),
     'The alert contact group "{0}" contains this contact, please remove it from the group before deleting the contact'),
    (re.compile(r'^唯一标识符 (.*?) 已存在，请更改后重试$', re.S),
     'The identifier {0} already exists, please choose another one'),
    (re.compile(r'^该标识符已被应用 (.*?) 使用，请更改后重试$', re.S),
     'This identifier is already used by app {0}, please choose another one'),
    (re.compile(r'^该标识符已被服务 (.*?) 使用，请更改后重试$', re.S),
     'This identifier is already used by service {0}, please choose another one'),
    (re.compile(r'^该服务在配置中心已被 "(.*)" 依赖，请解除依赖关系后再尝试删除。$', re.S),
     'This service is depended on by "{0}" in the configuration center, please remove the dependency before deleting it.'),
    (re.compile(r'^解析配置(.*)失败，确认其遵循 key = value 格式$', re.S),
     'Failed to parse configuration {0}, make sure it follows the key = value format'),
    (re.compile(r'^解析自定义全局变量(.*)失败，确认其遵循 key = value 格式$', re.S),
     'Failed to parse custom global variable {0}, make sure it follows the key = value format'),
    (re.compile(r'^通过SPUG_SET动态更新配置出错，未找到环境标识符(.*)$', re.S),
     'Failed to update configuration via SPUG_SET: environment identifier {0} not found'),
    (re.compile(r'^通过SPUG_SET动态更新配置出错，未找到应用或服务标识符(.*)$', re.S),
     'Failed to update configuration via SPUG_SET: app or service identifier {0} not found'),
    (re.compile(r'^(.*) 中已存在该Key$', re.S),
     'The key already exists in {0}'),
    (re.compile(r'^响应时间 (.*?)ms 大于 (.*?)ms$', re.S),
     'Response time {0}ms exceeds {1}ms'),
    (re.compile(r'^返回HTTP状态码 (.*)$', re.S),
     'Returned HTTP status code {0}'),
    (re.compile(r'^异常信息：(.*)$', re.S),
     'Exception: {0}'),
    (re.compile(r'^退出状态码：(.*)$', re.S),
     'Exit code: {0}'),
]


# Display values of model field choices, returned to the client through the
# *_alias keys (status_alias, type_alias, trigger_alias, ...).
CHOICES = {
    # deploy request status / type
    '待审核': 'Pending review',
    '待发布': 'Ready to deploy',
    '发布中': 'Deploying',
    '发布成功': 'Deployed',
    '发布异常': 'Failed',
    '已驳回': 'Rejected',
    '灰度成功': 'Partially deployed',
    '正常发布': 'Deploy',
    '回滚': 'Rollback',
    '自动发布': 'Auto deploy',
    # build status
    '未开始': 'Pending',
    '构建中': 'Building',
    '成功': 'Succeeded',
    '失败': 'Failed',
    # deploy config type
    '常规发布': 'Standard deploy',
    '自定义发布': 'Custom deploy',
    # monitor types
    '站点检测': 'Site check',
    '端口检测': 'Port check',
    'Ping检测': 'Ping check',
    '进程检测': 'Process check',
    '自定义脚本': 'Custom script',
    # alarm / notify
    '报警发生': 'Firing',
    '故障恢复': 'Resolved',
    '通知': 'Notification',
    '待办': 'To-do',
    '系统警告': 'System alert',
    '钉钉': 'DingTalk',
    '微信': 'WeChat',
    '企业微信': 'WeCom',
    '短信': 'SMS',
    '邮件': 'Email',
    # schedule trigger types
    '普通间隔': 'Interval',
    '一次性': 'One-time',
    '任务计划': 'Cron',
    '监控告警': 'Monitor alert',
    # config history actions
    '新增': 'Created',
    '更新': 'Updated',
    '删除': 'Deleted',
    # credential types
    '密码': 'Password',
    '密钥': 'SSH key',
    # host billing (cloud import)
    '包年包月': 'Subscription',
    '按量计费': 'Pay-as-you-go',
    '按带宽计费': 'Pay-by-bandwidth',
    '按流量计费': 'Pay-by-traffic',
    '其他': 'Other',
    # monitor / task status
    '正常': 'Normal',
    '异常': 'Abnormal',
    '执行中': 'Running',
    # misc module names
    '应用发布': 'Deployment',
    '监控中心': 'Monitoring',
}


_DURATION_RE = re.compile(r'^(?:(\d+)小时)?(?:(\d+)分钟?)?(?:(\d+(?:\.\d+)?)秒)?$')
_DURATION_UNITS = ('h', 'm', 's')
_EXCEPTION_PREFIX = 'Exception: '


def _translate_duration(text):
    """把 seconds_to_human() 生成的中文时长（如 1小时5分钟）转成 1h 5m"""
    match = _DURATION_RE.fullmatch(text)
    if not match or not any(match.groups()):
        return None
    return ' '.join(f'{v}{u}' for v, u in zip(match.groups(), _DURATION_UNITS) if v)


def translate(text):
    if not isinstance(text, str):
        return text
    hit = MESSAGES.get(text)
    if hit:
        return hit
    for regex, template in _PATTERNS:
        match = regex.fullmatch(text)
        if match:
            return template.format(*match.groups())
    duration = _translate_duration(text)
    if duration:
        return duration
    # 未捕获的异常经中间件包装为 "Exception: 原始消息"，对内层消息再翻译一次
    if text.startswith(_EXCEPTION_PREFIX):
        inner = text[len(_EXCEPTION_PREFIX):]
        translated = translate(inner)
        if translated != inner:
            return _EXCEPTION_PREFIX + translated
    return text


_CONSOLE_PATTERNS = [
    (re.compile(r'^\*\* 发布成功，耗时：(.*) \*\*$', re.S),
     '** Deployed successfully, duration: {0} **'),
    (re.compile(r'^\*\* 执行完成，耗时：(.*) \*\*$', re.S),
     '** Finished, duration: {0} **'),
    (re.compile(r'^\*\* 构建成功，耗时：(.*) \*\*$', re.S),
     '** Build succeeded, duration: {0} **'),
    (re.compile(r'^\*\* 执行结束，耗时：(.*) \*\*$', re.S),
     '** Finished, duration: {0} **'),
    (re.compile(r'^\*\* 分发完成，总耗时：(.*) \*\*$', re.S),
     '** Transfer completed, total duration: {0} **'),
    (re.compile(r'^检测到该主机的发布目录 (.*) 已存在，为了数据安全请自行备份后删除该目录，Spug 将会创建并接管该目录。$', re.S),
     'The deploy directory {0} already exists on this host, please back it up and remove it yourself for data safety, Spug will create and take over this directory.'),
    (re.compile(r'^不支持的节点模块: (.*)$', re.S),
     'Unsupported node module: {0}'),
    (re.compile(r'^应用名称: (.*)$', re.S), 'App: {0}'),
    (re.compile(r'^执行环境: (.*)$', re.S), 'Environment: {0}'),
    (re.compile(r'^代码分支: (.*)$', re.S), 'Branch: {0}'),
    (re.compile(r'^代码版本: (.*)$', re.S), 'Version: {0}'),
    (re.compile(r'^执行人员: (.*)$', re.S), 'Operator: {0}'),
    (re.compile(r'^执行时间: (.*)$', re.S), 'Time: {0}'),
    (re.compile(r'^推送对象: (.*)$', re.S), 'Recipients: {0}'),
    (re.compile(r'^标题: (.*)$', re.S), 'Title: {0}'),
    (re.compile(r'^获取动态环境变量失败: (.*)$', re.S),
     'Failed to read dynamic environment variables: {0}'),
    (re.compile(r'^开始推送(.*)消息$', re.S), 'Sending {0} message'),
    (re.compile(r'^(.*)消息推送完成$', re.S), '{0} push completed'),
    (re.compile(r'^(.*)消息推送失败: (.*)$', re.S), '{0} push failed: {1}'),
]

_CONSOLE_EDGE = r'(?:[\s\r\n]|\x1b\[[0-9;]*[A-Za-z])*'
_CONSOLE_RE = re.compile(rf'^({_CONSOLE_EDGE})(.*?)({_CONSOLE_EDGE})$', re.S)


def get_request_language(request):
    """请求语言，用于把后台执行产生的实时输出翻译成用户界面的语言"""
    return 'en' if request.headers.get('X-Language') == 'en' else 'zh'


def translate_console(text, language='zh'):
    """翻译发布/构建/流水线等实时控制台里由 Spug 自身产生的文案。

    首尾的空白、换行与 ANSI 颜色序列原样保留，只翻译中间的正文；
    字典未命中时原样返回，因此主机上命令的真实输出不会被改写。
    """
    if language != 'en' or not isinstance(text, str) or not text:
        return text
    match = _CONSOLE_RE.fullmatch(text)
    if not match:
        return text
    lead, core, tail = match.groups()
    if not core:
        return text
    return lead + _translate_console_core(core) + tail


def _translate_console_core(core):
    hit = MESSAGES.get(core)
    if hit:
        return hit
    for regex, template in _CONSOLE_PATTERNS:
        match = regex.fullmatch(core)
        if match:
            # 组内可能仍是可翻译的文案（推送方式名、内层错误、中文时长）
            return template.format(*(translate(x) if x else x for x in match.groups()))
    return translate(core)


def translate_choice(text):
    """Translate a model choice display value, used for the *_alias fields."""
    if not isinstance(text, str):
        return text
    hit = CHOICES.get(text)
    if hit:
        return hit
    return translate(text)
