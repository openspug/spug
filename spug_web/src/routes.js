import { makeModuleRoute } from "./libs/router";

import homeRoutes from './pages/home/routes';
import hostRoutes from './pages/host/routes';
import systemRoutes from './pages/system/routes';


export default [
  makeModuleRoute('/home', homeRoutes),
  makeModuleRoute('/host', hostRoutes),
  makeModuleRoute('/system', systemRoutes),
]