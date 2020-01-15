/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the MIT License.
 */
import { makeModuleRoute } from "./libs/router";

import welcomeRoues from './pages/welcome/routes';
import homeRoutes from './pages/home/routes';
import hostRoutes from './pages/host/routes';
import systemRoutes from './pages/system/routes';
import execRoutes from './pages/exec/routes';
import scheduleRoutes from './pages/schedule/routes';
import monitorRoutes from './pages/monitor/routes';
import alarmRoutes from './pages/alarm/routes';
import configRoutes from './pages/config/routes';
import deployRoutes from './pages/deploy/routes';


export default [
  makeModuleRoute('/welcome', welcomeRoues),
  makeModuleRoute('/home', homeRoutes),
  makeModuleRoute('/host', hostRoutes),
  makeModuleRoute('/system', systemRoutes),
  makeModuleRoute('/exec', execRoutes),
  makeModuleRoute('/schedule', scheduleRoutes),
  makeModuleRoute('/monitor', monitorRoutes),
  makeModuleRoute('/alarm', alarmRoutes),
  makeModuleRoute('/config', configRoutes),
  makeModuleRoute('/deploy', deployRoutes),
]
