/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the MIT License.
 */
import { makeRoute } from "../../libs/router";
import Template from './template';
import Task from './task';


export default [
  makeRoute('/template', Template),
  makeRoute('/task', Task),
]
