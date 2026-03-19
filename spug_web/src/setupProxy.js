const proxy = require('http-proxy-middleware');

module.exports = function(app) {
  // 1. WebSocket 请求 - 必须放在第一位，需要特殊的升级头
  app.use(
    '/api/ws', 
    proxy({
      target: 'http://127.0.0.1:9002',
      changeOrigin: true,
      ws: true,
      pathRewrite: {
        '^/api': ''
      },
      logLevel: 'debug'
    })
  );

  // 2. 普通 API 请求
  app.use(
    '/api',
    proxy({
      target: 'http://127.0.0.1:9001',
      changeOrigin: true,
      pathRewrite: {
        '^/api': ''
      }
    })
  );
};
