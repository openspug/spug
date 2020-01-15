/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the MIT License.
 */
import { makeRoute } from 'libs/router';
import Account from './account';
import Setting from './setting';
import Role from './role';

export default [
  makeRoute('/account', Account),
  makeRoute('/role', Role),
  makeRoute('/setting', Setting),
]
