const proxy = require('http-proxy-middleware');

module.exports = function(app) {
  // API 代理
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

  // WebSocket 代理
  app.use(
    '/ws',
    proxy({
      target: 'http://127.0.0.1:8000',
      changeOrigin: true,
      ws: true,
      logLevel: 'debug',
      onError: function(err, req, res) {
        console.log('WebSocket proxy error:', err);
      }
    })
  );

  // 执行任务代理
  app.use(
    '/exec',
    proxy({
      target: 'http://127.0.0.1:8000',
      changeOrigin: true,
      ws: true
    })
  );
};