import { makeModuleRoute } from "./libs/router";

import homeRoutes from './pages/home/routes';
import systemRoutes from './pages/system/routes';


export default [
  makeModuleRoute('/home', homeRoutes),
  makeModuleRoute('/system', systemRoutes),
]