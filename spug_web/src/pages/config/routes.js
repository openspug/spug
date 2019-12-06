import { makeRoute } from 'libs/router';
import Environment from './environment';
import Service from './service';


export default [
  makeRoute('/environment', Environment),
  makeRoute('/service', Service),
]