/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the MIT License.
 */
import { makeRoute } from "../../libs/router";
import app from './app';
import request from './request';
import doExt1Index from './do/Ext1Index';
import doExt2Index from './do/Ext2Index';


export default [
  makeRoute('/app', app),
  makeRoute('/request', request),
  makeRoute('/do/ext1/:id', doExt1Index),
  makeRoute('/do/ext2/:id', doExt2Index),
]
