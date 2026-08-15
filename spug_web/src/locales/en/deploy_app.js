/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the AGPL-3.0 License.
 */
const dict = {
  // AddSelect.js
  '选择发布方式': 'Select Deploy Type',
  '常规发布': 'Standard Deploy',
  '由 Spug 来控制发布的主流程，你可以通过添加钩子脚本来执行额外的自定义操作。': 'Spug drives the main deployment workflow, and you can add hook scripts to run extra custom steps.',
  '自定义发布': 'Custom Deploy',
  '你可以完全自己定义发布的所有流程和操作，Spug 负责按顺序依次执行你记录的动作。': 'You define every step of the deployment yourself, and Spug runs the actions you recorded in order.',

  // Ext1Form.js / Ext2Form.js
  '新建常规发布 - {}': 'New Standard Deploy - {}',
  '编辑常规发布 - {}': 'Edit Standard Deploy - {}',
  '查看常规发布 - {}': 'View Standard Deploy - {}',
  '新建自定义发布 - {}': 'New Custom Deploy - {}',
  '编辑自定义发布 - {}': 'Edit Custom Deploy - {}',
  '查看自定义发布 - {}': 'View Custom Deploy - {}',
  '基本配置': 'Basic Config',
  '构建配置': 'Build Config',
  '执行动作': 'Actions',

  // AutoDeploy.js
  '已复制': 'Copied',
  'Webhook可以用来与Git结合实现触发后自动发布。': 'Webhooks can be combined with Git to trigger deployments automatically.',
  '触发方式': 'Trigger type',
  '选择分支': 'Branch',
  '根据你的网络情况，首次刷新可能会很慢，请耐心等待。': 'The first refresh may take a while depending on your network, please be patient. ',
  '刷新失败？': 'Refresh failed?',
  '仅指定分支的事件触发自动发布': 'Only events on this branch trigger auto deploy',
  '指定分支': 'Branch',
  '请指定分支名称。': 'Please specify a branch name.',
  '点击复制链接，目前支持Gitee、Github、Gitlab、Gogs、Coding和Codeup(阿里云)。': 'Click to copy the URL. Gitee, GitHub, GitLab, Gogs, Coding and Codeup (Alibaba Cloud) are supported.',
  '调用该Webhook接口的访问凭据，在Gitee中为WebHook密码，Gogs中为密钥文本。': 'Access credential for calling this webhook endpoint — the "WebHook password" in Gitee, or the "secret" in Gogs.',
  '点击复制，老版本gitlab等无该项设置的可以在上述Webhook URL后边附加 &token={}': 'Click to copy. For older GitLab versions without this setting, append &token={} to the webhook URL above.',
  '请在系统管理/系统设置/开放服务设置中设置。': 'Set it in System / Settings / Open Service settings.',

  // CloneConfirm.js
  '克隆的应用': 'Source app',
  '请选择要克隆的应用': 'Select the app to clone from',
  '克隆的环境': 'Source environment',
  '请选择要克隆的环境': 'Select the environment to clone from',

  // Ext1Setup1.js / Ext2Setup1.js
  '已关闭': 'Disabled',
  '发布环境': 'Environment',
  '可以建立多个环境，实现同一应用在不同环境里配置不同的发布流程。': 'You can create multiple environments so the same app can have a different deploy workflow in each environment.',
  '请选择发布环境': 'Select an environment',
  '新建环境': 'New Environment',
  '目标主机': 'Target hosts',
  '该发布配置作用于哪些目标主机。': 'The target hosts this deploy config applies to.',
  'Git仓库地址': 'Git repository URL',
  '私有仓库？': 'Private repo?',
  '请输入Git仓库地址': 'Enter the Git repository URL',
  '发布模式': 'Deploy mode',
  '串行即发布时一台完成后再发布下一台，期间出现异常则终止发布。并行则每个主机相互独立发布同时进行。': 'In serial mode hosts are deployed one at a time, and the deployment stops when any host fails. In parallel mode all hosts are deployed independently at the same time.',
  '并行': 'Parallel',
  '串行': 'Serial',
  '发布审核': 'Deploy approval',
  '开启后发布申请需要审核（审核权限在系统管理/角色管理/功能权限中配置）通过后才能发布。': 'When enabled, a deploy request must be approved before it can be deployed. The approval permission is configured under System / Roles / Function permissions.',
  '消息通知': 'Notifications',
  '应用审核及发布成功或失败结果通知，': 'Get notified of approval results and deploy success or failure. ',
  '钉钉收不到通知？': 'Not receiving DingTalk notifications?',

  // Ext1Setup2.js
  '文件过滤规则': 'File filter rules',
  '请输入相对于项目根目录的文件路径，根据包含或排除规则进行打包。': 'Enter file paths relative to the project root; the package is built according to the include or exclude rule.',
  '仅打包匹配到的文件或目录，如果内容为空则打包所有。': 'Only matched files and directories are packaged. If empty, everything is packaged.',
  '包含': 'Include',
  '打包时排除匹配到的文件或目录，如果内容为空则不排除任何文件。': 'Matched files and directories are excluded from the package. If empty, nothing is excluded.',
  '排除': 'Exclude',
  '每行一条规则': 'One rule per line',
  '代码检出前执行': 'Run before checkout',
  '在运行 Spug 的服务器(或容器)上执行，当前目录为仓库源代码目录，可以执行任意自定义命令。': 'Runs on the server (or container) hosting Spug, with the repository source directory as the working directory. Any custom commands can be used.',
  '，请避免在此修改已跟踪的文件，防止在检出代码时失败。': ', but avoid modifying tracked files here or the code checkout may fail.',
  '输入要执行的命令': 'Enter the commands to run',
  '代码检出后执行': 'Run after checkout',
  '在运行 Spug 的服务器(或容器)上执行，当前目录为检出后的源代码目录，可执行任意自定义命令。': 'Runs on the server (or container) hosting Spug, with the checked-out source directory as the working directory. Any custom commands can be used.',
  '，大多数情况下在此进行构建操作。': '; in most cases this is where the build happens.',

  // Ext1Setup3.js
  '存储路径不能位于部署路径内': 'The artifact path cannot be inside the deploy path',
  '部署路径': 'Deploy path',
  '应用最终在主机上的部署路径，为了数据安全请确保该目录不存在，Spug 将会自动创建并接管该目录，可使用全局变量，例如：/www/$SPUG_APP_KEY': 'The path the app is deployed to on the target hosts. For data safety make sure it does not exist yet — Spug will create and take over this directory. Global variables are supported, e.g. /www/$SPUG_APP_KEY',
  '请输入部署目标路径': 'Enter the target deploy path',
  '存储路径': 'Artifact path',
  '此目录用于存储应用的历史版本，可使用全局变量，例如：/data/repos/$SPUG_APP_KEY': 'Directory that stores historical versions of the app. Global variables are supported, e.g. /data/repos/$SPUG_APP_KEY',
  '版本数量': 'Versions to keep',
  '早于指定数量的构建纪录及历史版本会被删除，以释放磁盘空间。': 'Build records and versions older than this number are deleted to free up disk space.',
  '请输入保存的版本数量': 'Enter the number of versions to keep',
  '应用发布前执行': 'Run before deploy',
  '在发布的目标主机上运行，当前目录为目标主机上待发布的源代码目录，可执行任意自定义命令。': 'Runs on the target hosts, with the to-be-deployed source directory as the working directory. Any custom commands can be used.',
  '，此时还未进行文件变更，可进行一些发布前置操作。': '; no files have been changed at this point, so you can do pre-deploy preparation here.',
  '应用发布后执行': 'Run after deploy',
  '在发布的目标主机上运行，当前目录为已发布的应用目录，可执行任意自定义命令。': 'Runs on the target hosts, with the deployed app directory as the working directory. Any custom commands can be used.',
  '，可以在发布后进行重启服务等操作。': '; a good place to restart services after the deployment.',

  // Ext2Setup2.js
  '相对于输入的本地路径的文件路径，仅将匹配到文件传输至要发布的目标主机。': 'File paths relative to the local path above; only matched files are transferred to the target hosts.',
  '支持模糊匹配，基于输入的本地路径匹配，匹配到文件将不会被传输。': 'Supports glob patterns matched against the local path above; matched files are not transferred.',
  'Spug 将遵循先本地后目标主机的原则，按照顺序依次执行添加的动作，例如：本地动作1 -> 本地动作2 -> 目标主机动作1 -> 目标主机动作2 ...': 'Spug runs the actions in order, local actions first and host actions second, e.g. local action 1 -> local action 2 -> host action 1 -> host action 2 ...',
  '执行的命令内可以使用发布申请中设置的环境变量 SPUG_RELEASE，一般可用于标记一次发布的版本号或提交ID等，在执行的脚本内通过使用 $SPUG_RELEASE 获取其值来执行相应操作。': 'Commands can use the SPUG_RELEASE environment variable set in the deploy request, typically carrying the version number or commit ID of a release; read $SPUG_RELEASE in your scripts to act on it.',
  '。': '.',
  '本地动作{}': 'Local action {}',
  '执行内容': 'Commands',
  '请输入要执行的动作': 'Enter the commands to run',
  '添加本地执行动作（在服务端本地执行）': 'Add local action (runs on the Spug server)',
  '目标主机动作{}': 'Host action {}',
  '数据来源': 'Data source',
  '请输入本地（部署spug的容器或主机）路径': 'Enter a local path on the host or container running Spug',
  '本地路径': 'Local path',
  '发布时上传': 'Upload on deploy',
  '过滤规则': 'Filter rule',
  '请输入逗号分割的过滤规则': 'Comma-separated filter rules',
  '目标路径': 'Target path',
  '使用前请务必阅读官方文档。': 'Please read the official docs before using this.',
  '请输入目标主机路径': 'Enter the path on the target hosts',
  '添加目标主机执行动作（在部署目标主机执行）': 'Add host action (runs on the target hosts)',
  '添加数据传输动作（仅能添加一个）': 'Add file transfer action (at most one)',

  // Form.js
  '编辑应用': 'Edit App',
  '新建应用': 'New App',
  '应用名称': 'App name',
  '请输入应用名称，例如：订单服务': 'Enter an app name, e.g. Order Service',
  '给应用设置的唯一标识符，会用于配置中心的配置生成。': 'A unique identifier for the app, also used when generating configs in the Config Center.',
  '可以由字母、数字和下划线组成。': 'Letters, numbers and underscores are allowed.',
  '请输入唯一标识符，例如：api_order': 'Enter a unique identifier, e.g. api_order',
  '请输入备注信息': 'Enter a description',

  // Repo.js
  '请输入仓库地址': 'Please enter the repository URL',
  '请输入账户': 'Please enter the username',
  '请输入密码': 'Please enter the password',
  '认证类型为账户密码，仓库地址需以http或https开头。': 'With username/password authentication, the repository URL must start with http or https.',
  '输入的仓库地址以http或https开头，则认证类型需为账户密码认证。': 'A repository URL starting with http or https requires username/password authentication.',
  '设置Git仓库': 'Set Up Git Repository',
  '认证类型': 'Auth type',
  '账户密码': 'Username/Password',
  '密钥': 'SSH Key',
  '仓库地址': 'Repository URL',
  '账户': 'Username',
  '请复制该密钥，以Gitee为例可参考': 'Copy this key; for Gitee, for example, follow the ',
  'Gitee文档': 'Gitee docs',
  '进行后续配置。': ' to finish the setup.',
  '点击复制密钥': 'Click to copy the key',

  // Table.js
  '选择克隆对象': 'Select Clone Source',
  '请选择要克隆的应用及环境': 'Please select the app and environment to clone',
  '确定要删除应用【{}】?': 'Are you sure you want to delete app [{}]?',
  '删除发布配置将会影响基于该配置所创建发布申请的发布和回滚功能，确定要删除【{}】的发布配置?': 'Deleting this deploy config will break deploy and rollback for deploy requests created from it. Are you sure you want to delete the deploy config for [{}]?',
  '模式': 'Mode',
  '关联主机': 'Hosts',
  '{} 台': '{} hosts',
  '应用列表': 'Apps',
  '新建发布': 'New Deploy',
  '克隆发布': 'Clone Deploy',

  // index.js (keep in sync with layout.js which also defines 应用管理)
  '首页': 'Home',
  '应用管理': 'Deploy Configs',

  // Tips.js
  '内置全局变量': 'built-in global variables',
  '配置中心应用的配置将会以 _SPUG_标识符_Key 方式组合成环境变量，可通过执行 env | grep SPUG 来查看所有的内置的和配置中心的可使用变量。': 'App configs from the Config Center are exposed as environment variables named _SPUG_IDENTIFIER_KEY. Run env | grep SPUG to see all available built-in and Config Center variables.',
  '配置中心的配置变量': 'config variables from the Config Center',
  '可使用 ': 'You can use ',
  ' 和 ': ' and ',
};

export default dict;
