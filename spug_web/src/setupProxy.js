/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the AGPL-3.0 License.
 */
const proxy = require('http-proxy-middleware');

module.exports = function (app) {
  app.use(proxy('/api/', {
    target: 'http://127.0.0.1:8000',
    changeOrigin: true,
    ws: true,
    headers: {'X-Real-IP': '1.1.1.1'},
    pathRewrite: {
      '^/api': ''
    },
    // 添加错误处理
    onError: (err, req, res) => {
      console.log('Proxy error:', err.message);
      if (!res.headersSent) {
        res.writeHead(500, {
          'Content-Type': 'application/json',
        });
        res.end(JSON.stringify({ error: 'Proxy error' }));
      }
    },
    // 添加连接配置
    timeout: 30000,
    proxyTimeout: 30000
  }))
};
