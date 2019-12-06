import { makeRoute } from 'libs/router';
import Account from './account';
import Setting from './setting';

export default [
  makeRoute('/account', Account),
  makeRoute('/setting', Setting),
]