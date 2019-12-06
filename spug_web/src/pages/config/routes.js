import { makeRoute } from 'libs/router';
import Environment from './environment';


export default [
  makeRoute('/environment', Environment),
]