/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the MIT License.
 */
const proxy = require('http-proxy-middleware');

module.exports = function (app) {
  app.use(proxy('/api/', {
    target: 'http://127.0.0.1:8000',
    changeOrigin: true,
    ws: true,
    headers: {'X-Real-IP': '127.0.0.1'},
    pathRewrite: {
      '^/api': ''
    }
  }))
};
