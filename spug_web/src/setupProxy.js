const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function (app) {
  // API 代理
  app.use(
    '/api',
    createProxyMiddleware({
      target: 'http://127.0.0.1:8000',
      changeOrigin: true,
      headers: {
        'X-Real-IP': '1.1.1.1',
        'X-Forwarded-For': '1.1.1.1',
      },
      pathRewrite: {
        '^/api': ''  // 去掉 /api 前缀
      },
      logLevel: 'debug',
    })
  );

  // WebSocket 代理 - 注意这里没有 pathRewrite
  app.use(
    '/ws',
    createProxyMiddleware({
      target: 'http://127.0.0.1:8000',
      changeOrigin: true,
      ws: true,  // 启用 WebSocket
      logLevel: 'debug',
      headers: {
        'X-Real-IP': '1.1.1.1',
      },
      onError: (err, req, res) => {
        console.error('WebSocket proxy error:', err);
      },
      onProxyReqWs: (proxyReq, req, socket, options, head) => {
        console.log('WebSocket connected:', req.url);
        // 添加必要的 WebSocket 头
        proxyReq.setHeader('Connection', 'Upgrade');
        proxyReq.setHeader('Upgrade', 'websocket');
        proxyReq.setHeader('Sec-WebSocket-Key', req.headers['sec-websocket-key']);
        proxyReq.setHeader('Sec-WebSocket-Version', req.headers['sec-websocket-version']);
      },
      onProxyRes: (proxyRes, req, res) => {
        if (req.url.includes('/ws')) {
          console.log('WebSocket response:', proxyRes.statusCode);
        }
      }
    })
  );

  // 添加一个专门用于执行任务的 WebSocket 代理
  app.use(
    '/exec',
    createProxyMiddleware({
      target: 'http://127.0.0.1:8000',
      changeOrigin: true,
      ws: true,
      logLevel: 'debug',
    })
  );

  // 静态资源代理（可选）
  app.use(
    '/static',
    createProxyMiddleware({
      target: 'http://127.0.0.1:8000',
      changeOrigin: true,
    })
  );
};