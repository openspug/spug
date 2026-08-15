/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the AGPL-3.0 License.
 */
import _http from './http';
import _history from './history';

// 注意：./router 会 import ../routes 拉入整棵页面树，而页面模块普遍从 'libs' 反向导入，
// 形成循环依赖。无依赖的叶子模块必须排在 ./router 之前重导出，否则递归回到本模块时
// 其导出尚未注册，页面里模块加载期就调用的 t()/工具函数会得到 undefined。
export * from './functools';
export * from './i18n';
export * from './router';
export const http = _http;
export const history = _history;
export const VERSION = 'v4.0.0';
