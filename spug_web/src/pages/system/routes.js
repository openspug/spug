import { makeRoute } from 'libs/router';
import AccountIndex from './account/index';

export default [
  makeRoute('/account', AccountIndex)
]