/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the AGPL-3.0 License.
 */
import React from 'react';
import { t, hasPermission } from 'libs';
import {
  DashboardOutlined,
  CloudServerOutlined,
  CodeOutlined,
  FlagOutlined,
  ScheduleOutlined,
  DeploymentUnitOutlined,
  MonitorOutlined,
  AlertOutlined,
  RobotOutlined,
  SettingOutlined
} from '@ant-design/icons';

import DashboardIndex from './pages/dashboard';
import HostIndex from './pages/host';
import ExecTask from './pages/exec/task';
import ExecTemplate from './pages/exec/template';
import ExecTransfer from './pages/exec/transfer';
import DeployApp from './pages/deploy/app';
import DeployRepository from './pages/deploy/repository';
import DeployRequest from './pages/deploy/request';
import ScheduleIndex from './pages/schedule';
import ConfigEnvironment from './pages/config/environment';
import ConfigService from './pages/config/service';
import ConfigApp from './pages/config/app';
import ConfigSetting from './pages/config/setting';
import ConfigModel from './pages/config/model';
import AgentIndex from './pages/ai/agent';
import AISetting from './pages/ai/setting';
import MonitorIndex from './pages/monitor';
import AlarmIndex from './pages/alarm/alarm';
import AlarmGroup from './pages/alarm/group';
import AlarmContact from './pages/alarm/contact';
import SystemAccount from './pages/system/account';
import SystemRole from './pages/system/role';
import SystemSetting from './pages/system/setting';
import SystemLogin from './pages/system/login';
import SystemCredential from './pages/system/credential';
import WelcomeIndex from './pages/welcome/index';
import WelcomeInfo from './pages/welcome/info';
import PipelineIndex from './pages/pipeline';
import PipelineEditor from './pages/pipeline/Editor';

const routes = [
  {
    icon: <DashboardOutlined/>,
    title: 'Dashboard',
    auth: 'dashboard.dashboard.view',
    path: '/dashboard',
    component: DashboardIndex
  },
  {icon: <CloudServerOutlined/>, title: t('主机管理'), auth: 'host.host.view', path: '/host', component: HostIndex},
  {
    icon: <CodeOutlined/>, title: t('批量执行'), auth: 'exec.task.do|exec.template.view', child: [
      {title: t('执行任务'), auth: 'exec.task.do', path: '/exec/task', component: ExecTask},
      {title: t('模板管理'), auth: 'exec.template.view', path: '/exec/template', component: ExecTemplate},
      {title: t('文件分发'), auth: 'exec.transfer.do', path: '/exec/transfer', component: ExecTransfer},
    ]
  },
  {
    icon: <FlagOutlined/>, title: t('应用发布'), auth: 'deploy.app.view|deploy.repository.view|deploy.request.view', child: [
      {title: t('发布配置'), auth: 'deploy.app.view', path: '/deploy/app', component: DeployApp},
      {title: t('构建仓库'), auth: 'deploy.repository.view', path: '/deploy/repository', component: DeployRepository},
      {title: t('发布申请'), auth: 'deploy.request.view', path: '/deploy/request', component: DeployRequest},
    ]
  },
  {path: '/pipeline/:id', component: PipelineEditor},
  {icon: <FlagOutlined/>, title: t('流水线'), auth: 'pipeline.pipeline.view', path: '/pipeline', component: PipelineIndex},
  {
    icon: <ScheduleOutlined/>,
    title: t('任务计划'),
    auth: 'schedule.schedule.view',
    path: '/schedule',
    component: ScheduleIndex
  },
  {
    icon: <DeploymentUnitOutlined/>, title: t('配置中心'), auth: 'config.env.view|config.src.view|config.app.view|config.model.view', child: [
      {title: t('环境管理'), auth: 'config.env.view', path: '/config/environment', component: ConfigEnvironment},
      {title: t('服务配置'), auth: 'config.src.view', path: '/config/service', component: ConfigService},
      {title: t('应用配置'), auth: 'config.app.view', path: '/config/app', component: ConfigApp},
      {title: t('模型配置'), auth: 'config.model.view', path: '/config/model', component: ConfigModel},
      {path: '/config/setting/:type/:id', component: ConfigSetting},
    ]
  },
  {
    icon: <RobotOutlined/>, title: t('智能体'), auth: 'ai.agent.view|ai.mcp.view|ai.skill.view', child: [
      {title: t('智能对话'), auth: 'ai.agent.view', path: '/ai/agent', component: AgentIndex},
      {title: t('扩展管理'), auth: 'ai.mcp.view|ai.skill.view', path: '/ai/setting', component: AISetting},
    ]
  },
  {icon: <MonitorOutlined/>, title: t('监控中心'), auth: 'monitor.monitor.view', path: '/monitor', component: MonitorIndex},
  {
    icon: <AlertOutlined/>, title: t('报警中心'), auth: 'alarm.alarm.view|alarm.contact.view|alarm.group.view', child: [
      {title: t('报警历史'), auth: 'alarm.alarm.view', path: '/alarm/alarm', component: AlarmIndex},
      {title: t('报警联系人'), auth: 'alarm.contact.view', path: '/alarm/contact', component: AlarmContact},
      {title: t('报警联系组'), auth: 'alarm.group.view', path: '/alarm/group', component: AlarmGroup},
    ]
  },
  {
    icon: <SettingOutlined/>, title: t('系统管理'), auth: "system.account.view|system.role.view|system.setting.view", child: [
      {title: t('登录日志'), auth: 'system.login.view', path: '/system/login', component: SystemLogin},
      {title: t('凭据管理'), auth: 'system.credential.view', path: '/system/credential', component: SystemCredential},
      {title: t('账户管理'), auth: 'system.account.view', path: '/system/account', component: SystemAccount},
      {title: t('角色管理'), auth: 'system.role.view', path: '/system/role', component: SystemRole},
      {title: t('系统设置'), auth: 'system.setting.view', path: '/system/setting', component: SystemSetting},
    ]
  },
  {path: '/welcome/index', component: WelcomeIndex},
  {path: '/welcome/info', component: WelcomeInfo},
]

// 系统默认首页（工作台已移除，默认进入 Dashboard）
export const DEFAULT_PATH = '/dashboard';

// 无 Dashboard 权限时，回退到第一个有权限的菜单页
export function getDefaultPath() {
  if (hasPermission('dashboard.dashboard.view')) return DEFAULT_PATH;
  for (let item of routes) {
    if (!item.title) continue;
    if (item.child) {
      for (let sub of item.child) {
        if (sub.title && sub.path && (!sub.auth || hasPermission(sub.auth))) return sub.path;
      }
    } else if (item.path && (!item.auth || hasPermission(item.auth))) {
      return item.path;
    }
  }
  return DEFAULT_PATH;
}

export default routes;
