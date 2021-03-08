/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the AGPL-3.0 License.
 */
import React from 'react';
import {
  DesktopOutlined,
  CloudServerOutlined,
  CodeOutlined,
  FlagOutlined,
  ScheduleOutlined,
  DeploymentUnitOutlined,
  MonitorOutlined,
  AlertOutlined,
  SettingOutlined
} from '@ant-design/icons';
import HomeIndex from './pages/home';

import HostIndex from './pages/host';

import ExecTask from './pages/exec/task';
import ExecTemplate from './pages/exec/template';

import DeployApp from './pages/deploy/app';
import DeployRepository from './pages/deploy/repository';
import DeployRequest from './pages/deploy/request';
import DoExt1Index from './pages/deploy/do/Ext1Index';
import DoExt2Index from './pages/deploy/do/Ext2Index';

import ScheduleIndex from './pages/schedule';

import ConfigEnvironment from './pages/config/environment';
import ConfigService from './pages/config/service';
import ConfigApp from './pages/config/app';
import ConfigSetting from './pages/config/setting';

import MonitorIndex from './pages/monitor';

import AlarmIndex from './pages/alarm/alarm';
import AlarmGroup from './pages/alarm/group';
import AlarmContact from './pages/alarm/contact';

import SystemAccount from './pages/system/account';
import SystemRole from './pages/system/role';
import SystemSetting from './pages/system/setting';

import WelcomeIndex from './pages/welcome/index';
import WelcomeInfo from './pages/welcome/info';

export default [
  {icon: <DesktopOutlined/>, title: '工作台', auth: 'home.home.view', path: '/home', component: HomeIndex},
  {icon: <CloudServerOutlined/>, title: '主机管理', auth: 'host.host.view', path: '/host', component: HostIndex},
  {
    icon: <CodeOutlined/>, title: '批量执行', auth: 'exec.task.do|exec.template.view', child: [
      {title: '执行任务', auth: 'exec.task.do', path: '/exec/task', component: ExecTask},
      {title: '模板管理', auth: 'exec.template.view', path: '/exec/template', component: ExecTemplate},
    ]
  },
  {
    icon: <FlagOutlined/>, title: '应用发布', auth: 'deploy.app.view|deploy.request.view', child: [
      {title: '应用管理', auth: 'deploy.app.view', path: '/deploy/app', component: DeployApp},
      {title: '构建仓库', auth: 'deploy.repository.view', path: '/deploy/repository', component: DeployRepository},
      {title: '发布申请', auth: 'deploy.request.view', path: '/deploy/request', component: DeployRequest},
      {path: '/deploy/do/ext1/:id', component: DoExt1Index},
      {path: '/deploy/do/ext2/:id', component: DoExt2Index},
      {path: '/deploy/do/ext1/:id/:log', component: DoExt1Index},
      {path: '/deploy/do/ext2/:id/:log', component: DoExt2Index},
    ]
  },
  {
    icon: <ScheduleOutlined/>,
    title: '任务计划',
    auth: 'schedule.schedule.view',
    path: '/schedule',
    component: ScheduleIndex
  },
  {
    icon: <DeploymentUnitOutlined/>, title: '配置中心', auth: 'config.env.view|config.src.view|config.app.view', child: [
      {title: '环境管理', auth: 'config.env.view', path: '/config/environment', component: ConfigEnvironment},
      {title: '服务配置', auth: 'config.src.view', path: '/config/service', component: ConfigService},
      {title: '应用配置', auth: 'config.app.view', path: '/config/app', component: ConfigApp},
      {path: '/config/setting/:type/:id', component: ConfigSetting},
    ]
  },
  {icon: <MonitorOutlined/>, title: '监控中心', auth: 'monitor.monitor.view', path: '/monitor', component: MonitorIndex},
  {
    icon: <AlertOutlined/>, title: '报警中心', auth: 'alarm.alarm.view|alarm.contact.view|alarm.group.view', child: [
      {title: '报警历史', auth: 'alarm.alarm.view', path: '/alarm/alarm', component: AlarmIndex},
      {title: '报警联系人', auth: 'alarm.contact.view', path: '/alarm/contact', component: AlarmContact},
      {title: '报警联系组', auth: 'alarm.group.view', path: '/alarm/group', component: AlarmGroup},
    ]
  },
  {
    icon: <SettingOutlined/>, title: '系统管理', auth: "system.account.view|system.role.view|system.setting.view", child: [
      {title: '账户管理', auth: 'system.account.view', path: '/system/account', component: SystemAccount},
      {title: '角色管理', auth: 'system.role.view', path: '/system/role', component: SystemRole},
      {title: '系统设置', auth: 'system.setting.view', path: '/system/setting', component: SystemSetting},
    ]
  },
  {path: '/welcome/index', component: WelcomeIndex},
  {path: '/welcome/info', component: WelcomeInfo},
]
