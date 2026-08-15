/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the AGPL-3.0 License.
 */
const dict = {
  // index / Table
  '首页': 'Home',
  '任务列表': 'Tasks',
  '任务名称': 'Task name',
  '任务类型': 'Task type',
  '触发方式': 'Trigger',
  '最新状态': 'Latest status',
  '待调度': 'Pending',
  '执行中': 'Running',
  '已激活': 'Active',
  '未激活': 'Inactive',
  '更新于': 'Updated at',
  '执行测试': 'Test Run',
  '禁用任务': 'Disable Task',
  '激活任务': 'Activate Task',
  '历史记录': 'History',
  '确定要禁用任务【{}】?': 'Are you sure you want to disable task [{}]?',
  '确定要激活任务【{}】?': 'Are you sure you want to activate task [{}]?',
  '立即以串行模式执行该任务（不影响调度规则，且不会触发失败通知，测试执行会有120秒的超时，真实调度执行无此限制）？':
    'Run this task now in serial mode? It does not affect the schedule and no failure notification will be sent. Test runs have a 120-second timeout, which does not apply to real scheduled runs.',

  // Form wizard
  '新建任务': 'New Task',
  '编辑任务': 'Edit Task',
  '创建任务': 'Create Task',
  '设置触发器': 'Set Trigger',
  '选择执行对象': 'Select Targets',

  // Step1 - basic info
  '添加任务类型': 'Add Task Type',
  '添加类型': 'Add Type',
  '请选择任务类型': 'Select task type',
  '请输入任务名称': 'Enter task name',
  '任务内容': 'Task content',
  '从模板添加': 'Add from Template',
  '失败通知': 'Failure notification',
  '任务执行失败告警通知，': 'Send an alert notification when the task fails. ',
  '钉钉收不到通知？': 'Not receiving DingTalk notifications?',
  '已关闭': 'Disabled',
  '请输入模板备注信息': 'Enter description',

  // Step2 - triggers
  '普通间隔': 'Interval',
  '间隔时间(秒)': 'Interval (seconds)',
  '每隔指定n秒执行一次。': 'Runs every N seconds.',
  '一次性': 'One-time',
  '仅在指定时间运行一次。': 'Runs once at the specified time.',
  '请选择执行时间': 'Select run time',
  '执行规则': 'Cron expression',
  '兼容Cron风格，可参考官方例子。': 'Compatible with Cron syntax, see the official examples for reference.',
  '例如每天凌晨1点执行：0 1 * * *': 'e.g. run at 1:00 AM every day: 0 1 * * *',
  '生效时间': 'Effective time',
  '定义的执行规则在到达该时间后生效。': 'The cron expression takes effect after this time.',
  '执行规则在到达该时间后不再执行。': 'The task will no longer run after this time.',
  '可选输入': 'Optional',
  '监控告警': 'Monitor Alert',
  '监控项目': 'Monitor items',
  '当监控项触发告警时执行。': 'Runs when the monitor item triggers an alert.',
  '添加监控项': 'Add Monitor Item',

  // Step3 - targets
  '监控告警类触发器，只能选择一个执行对象': 'A monitor alert trigger can only have one target',
  '执行对象选择有误，请重新选择': 'Invalid target selection, please select again',
  '执行对象': 'Targets',
  '本机': 'Localhost',
  '告警关联主机': 'Alert-related host',
  '本机即Spug服务运行所在的容器或主机。': 'Localhost is the container or host where the Spug service runs.',
  '添加执行对象': 'Add Target',

  // Info / Record
  '任务执行详情': 'Execution Details',
  '执行失败': 'Execution failed',
  '平均耗时(秒)': 'Avg duration (s)',
  '执行时间： {}（{}）': 'Run time: {} ({})',
  '运行耗时： {} s': 'Duration: {} s',
  '返回状态： {}（非 0 则判定为失败）': 'Exit code: {} (non-zero means failure)',
  '执行输出：': 'Output:',
  '执行状态': 'Status',
  '任务执行记录 - {}': 'Execution History - {}',
};

export default dict;
