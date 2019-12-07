import { makeRoute } from 'libs/router';
import Environment from './environment';
import Service from './service';
import Setting from './setting';


export default [
  makeRoute('/environment', Environment),
  makeRoute('/service', Service),
  makeRoute('/setting/:type/:id', Setting),
]