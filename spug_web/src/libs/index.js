/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the AGPL-3.0 License.
 */
import _http from './http';
import _history from './history';

export * from './functools';
export * from './router';
export const http = _http;
export const history = _history;
export const VERSION = 'v2.3.17';
