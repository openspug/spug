/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the AGPL-3.0 License.
 */
const dict = {
  // Shared
  '首页': 'Home',
  '配置': 'Configs',
  '可以由字母、数字和下划线组成。': 'Letters, digits and underscores only.',
  '请输入备注信息': 'Enter a description',
  '请输入唯一标识符': 'Identifier',

  // Applications
  '应用列表': 'Applications',
  '应用名称': 'App Name',
  '编辑应用': 'Edit App',
  '新建应用': 'New App',
  '请输入应用名称，例如：订单服务': 'App name, e.g. Order Service',
  '应用的唯一标识符，会作为生成配置的前缀。': 'Unique identifier of the app, used as the prefix of generated config variables.',
  '请输入唯一标识符，例如：api_order': 'Identifier, e.g. api_order',
  '依赖': 'Dependencies',
  '配置服务依赖': 'Configure Dependencies',
  '应用依赖': 'App Dependencies',
  '服务依赖': 'Service Dependencies',
  '设置依赖后，该应用将能够获取到所依赖应用的配置。': 'Once dependencies are set, this app can also read the configs of the apps it depends on.',
  '设置依赖后，该应用将能够获取到所依赖服务的配置。': 'Once dependencies are set, this app can also read the configs of the services it depends on.',
  '所有应用': 'All Apps',
  '已选应用': 'Selected Apps',
  '所有服务': 'All Services',
  '已选服务': 'Selected Services',

  // Environments
  '环境列表': 'Environments',
  '环境名称': 'Environment Name',
  '编辑环境': 'Edit Environment',
  '新建环境': 'New Environment',
  '请输入环境名称，例如：开发环境': 'Environment name, e.g. Development',
  '环境的唯一标识符，会在配置中心API中使用，具体请参考官方文档。': 'Unique identifier of the environment, used by the Config Center API. See the official docs for details.',
  '请输入唯一标识符，例如：dev': 'Identifier, e.g. dev',

  // Services
  '服务列表': 'Services',
  '服务名称': 'Service Name',
  '编辑服务': 'Edit Service',
  '新建服务': 'New Service',
  '将会同步删除服务的配置信息，确定要删除服务【{}】? ': 'Its config entries will be deleted as well. Are you sure you want to delete service [{}]?',
  '服务可以理解为一些配置的集合。': 'A service is simply a collection of config entries.',
  '请输入服务名称': 'Service name',
  '服务的唯一标识符，会作为生成配置的前缀。': 'Unique identifier of the service, used as the prefix of generated config variables.',

  // Config editing
  '无可用环境': 'No environment available',
  '配置依赖应用的运行环境，请在': 'Configs are bound to environments. Please create one in',
  '中创建环境。': 'first.',
  '更改历史': 'Change History',
  '对比配置': 'Compare Configs',
  '视图': 'View',
  '表格视图': 'Table View',
  '文本视图': 'Text View',
  'JSON视图': 'JSON View',
  '新增配置': 'New Config',
  '更新配置': 'Update Config',
  '变量前缀由_SPUG_加唯一标识符组成，用于防止变量名冲突。': 'Variable names are prefixed with _SPUG_ plus the identifier to avoid naming conflicts.',
  '请输入变量名': 'Variable name',
  '请输入变量值': 'Variable value',
  '选择环境': 'Select environments',
  '可多选环境，复制到所有选择的环境内。': 'You can select multiple environments; the config will be created in each of them.',
  '操作人': 'Updated by',
  '操作时间': 'Updated at',
  '确定要删除【{}】环境下的配置【{}】?': 'Environment [{}]: are you sure you want to delete config [{}]?',
  '动作': 'Action',
  '{} - 更改历史记录': '{} - Change History',
  'Tips: 通过对比配置功能，可以查看多个环境间的配置差异': 'Tips: compare configs to see the differences across environments',
  '要对比的环境': 'Environments to compare',
  '隐藏相同配置': 'Hide identical configs',
  '解析JSON失败，请检查输入内容': 'Failed to parse JSON, please check your input',
};

export default dict;
