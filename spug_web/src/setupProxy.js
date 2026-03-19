const proxy = require('http-proxy-middleware');

module.exports = function(app) {
  // 1. 【必须放在第一位】专门拦截 WebSocket 请求 - /api/ws/
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

  // 2. 【第二位】拦截直接的 /ws/ 请求
  app.use(
    '/ws',
    proxy({
      target: 'http://127.0.0.1:9002',
      changeOrigin: true,
      ws: true,
      logLevel: 'debug'
    })
  );

  // 3. 【放在最后】处理普通的 API 请求
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