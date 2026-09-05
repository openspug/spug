/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the AGPL-3.0 License.
 */
const dict = {
  // index.js
  '首页': 'Home',

  // Form.js
  '编辑任务': 'Edit Task',
  '新建任务': 'New Task',
  '创建任务': 'Create Task',
  '设置规则': 'Configure Rules',

  // MonitorCard.js
  '总览': 'Overview',
  '警告': 'Warning',
  '紧急': 'Critical',
  '未激活': 'Inactive',
  '已激活': 'Active',
  '待调度': 'Pending',
  '分组': 'Group',
  '目标': 'Target',
  '更新': 'Updated',
  '描述': 'Description',
  '分组：': 'Group:',
  '类型：': 'Type:',
  '名称：': 'Name:',
  '自动刷新': 'Auto refresh',
  '开启自动刷新': 'Auto refresh enabled',
  '关闭自动刷新': 'Auto refresh disabled',

  // Step1.js
  '返回HTTP状态码200-399则判定为正常，其他为异常。': 'HTTP status codes 200-399 are considered healthy, anything else is treated as a failure.',
  '脚本执行退出状态码为 0 则判定为正常，其他为异常。': 'Exit code 0 is considered healthy, anything else is treated as a failure.',
  '监控分组': 'Group',
  '添加监控分组': 'Add Monitor Group',
  '请选择监控分组': 'Select group',
  '添加分组': 'Add Group',
  '监控类型': 'Type',
  '请选择监控类型': 'Select type',
  '站点检测': 'Site Check',
  '端口检测': 'Port Check',
  'Ping检测': 'Ping Check',
  '进程检测': 'Process Check',
  '自定义脚本': 'Custom Script',
  '监控名称': 'Name',
  '请输入监控名称': 'Enter monitor name',
  '监控地址': 'Targets',
  'http(s)://开头，支持多个地址，每输入完成一个后按回车确认': 'Starts with http(s)://, multiple targets supported, press Enter after each one',
  'IP或域名，支持多个地址，每输入完成一个后按回车确认': 'IP or domain, multiple targets supported, press Enter after each one',
  '监控主机': 'Hosts',
  '响应时间': 'Response Time',
  '最长响应时间（毫秒），不设置则默认30秒超时': 'Max response time in milliseconds, defaults to a 30-second timeout',
  '检测端口': 'Port',
  '请输入端口号': 'Enter port number',
  '进程名称': 'Process Name',
  '执行 ps -ef 看到的进程名称。': 'The process name as shown in ps -ef output.',
  '请输入进程名称': 'Enter process name',
  '脚本内容': 'Script Content',
  '从模板添加': 'Add from Template',
  '请输入备注信息': 'Enter description',
  '执行测试': 'Run Test',
  'Tips: 仅测试第一个监控地址': 'Tips: only the first target will be tested',
  '请输入正确的响应时间': 'Please enter a valid response time',
  '请输入正确的端口号': 'Please enter a valid port number',

  // Step2.js
  '监控频率': 'Check Frequency',
  '每隔N分钟检测一次': 'Run a check every N minutes',
  '{}分钟': '{} min',
  '{}小时': '{} hours',
  '{}次': '{} time(s)',
  '报警阈值': 'Alert Threshold',
  '连续N次检测失败，则发送告警': 'Send an alert after N consecutive failed checks',
  '报警联系人组': 'Contact Groups',
  '去创建': 'Create',
  '和': 'and',
  '。': '.',
  '联系人组': 'Contact Groups',
  '已有联系组': 'Available',
  '已选联系组': 'Selected',
  '报警方式': 'Alert Channels',
  '通道沉默': 'Quiet Period',
  '相同的告警信息，沉默期内只发送一次。': 'Identical alerts are sent only once within the quiet period.',

  // Step2.js - AI handling
  '智能处理': 'AI Handling',
  '达到报警阈值后立即发出告警通知，随后由智能体处理，处理完成再追加一条结论通知（共两条）':
    'Once the threshold is reached an alert is sent immediately, then the agent takes over and sends a second notification with its conclusion (two notifications in total)',
  '不启用': 'Disabled',
  'AI诊断': 'AI Diagnosis',
  'AI修复': 'AI Repair',
  '排查主机': 'Target Host',
  '请选择主机': 'Select a host',
  '智能体将通过SSH登录该主机进行排查，仅可选择已验证的主机。':
    'The agent connects to this host over SSH. Only verified hosts can be selected.',
  '最大排查轮次': 'Max Diagnosis Rounds',
  '最大修复轮次': 'Max Repair Rounds',
  '轮': 'rounds',
  '每轮为：AI给出命令 → 执行 → 分析；定位到原因会提前结束，达到该次数仍未定位则终止并通知。':
    'Each round is: the AI proposes commands, they are executed, then analysed. It stops early once the cause is found; if the limit is reached without a conclusion it terminates and notifies you.',
  '每轮为：AI给出命令 → 执行 → 自动复检；超过该次数仍未恢复则终止并通知。':
    'Each round is: the AI proposes commands, they are executed, then the fault is re-checked automatically. If the service is still down after the limit it terminates and notifies you.',
  '故障时先发告警通知，随后AI在排查主机上执行修复命令（已内置高危命令拦截），修复结束再发一条结果通知，处理过程可在智能体模块查看。':
    'An alert is sent as soon as the fault is detected. The AI then runs repair commands on the target host (dangerous commands are blocked) and sends a second notification with the result. The full trace is available in the Agent module.',
  '故障时先发告警通知，随后AI只执行只读命令排查，不会修改服务器任何内容，排查结束再发一条结论通知。':
    'An alert is sent as soon as the fault is detected. The AI then investigates using read-only commands without changing anything on the server, and sends a second notification with its conclusion.',

  // Table.js
  '监控任务': 'Monitors',
  '确定要{}【{}】?': 'Are you sure you want to {} [{}]?',
  '频率': 'Interval',
  '更新于': 'Updated',
};

export default dict;
