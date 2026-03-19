// src/setupProxy.js
const proxy = require('http-proxy-middleware');

module.exports = function(app) {
  // 核心：WebSocket 代理
  app.use(
    '/api/ws',
    proxy({
      target: 'http://127.0.0.1:8000',
      changeOrigin: true,
      ws: true,
      xfwd: true, // 必须：转发 X-Forwarded-For 等 Header
      pathRewrite: { '^/api': '' },
      logLevel: 'debug'
    })
  );

  // 普通 API 代理
  app.use(
    '/api',
    proxy({
      target: 'http://127.0.0.1:8000',
      changeOrigin: true,
      pathRewrite: { '^/api': '' }
    })
  );
};