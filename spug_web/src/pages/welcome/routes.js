/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the MIT License.
 */
import { makeRoute } from 'libs/router';
import Index from './index';
import Info from './info';

export default [
  makeRoute('/index', Index),
  makeRoute('/info', Info),
]
