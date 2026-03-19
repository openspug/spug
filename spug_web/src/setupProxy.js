const proxy = require('http-proxy-middleware');

module.exports = function(app) {
  // 1. 【必须放在第一位】专门拦截 WebSocket 请求
  app.use(
    '/api/ws', 
    proxy({
      target: 'http://127.0.0.1:8000',
      changeOrigin: true,
      ws: true, // 开启 WebSocket 支持
      pathRewrite: {
        '^/api': '' // 将 /api/ws/notify 重写为 /ws/notify
      },
      logLevel: 'debug' 
    })
  );

  // 2. 【放在后面】处理普通的 API 请求
  app.use(
    '/api',
    proxy({
      target: 'http://127.0.0.1:8000',
      changeOrigin: true,
      pathRewrite: {
        '^/api': ''
      }
    })
  );
};