import { makeRoute } from 'libs/router';
import Environment from './environment';
import Service from './service';
import App from './app';
import Setting from './setting';


export default [
  makeRoute('/environment', Environment),
  makeRoute('/service', Service),
  makeRoute('/app', App),
  makeRoute('/setting/:type/:id', Setting),
]