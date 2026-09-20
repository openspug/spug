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
      // WebSocket 升级失败时第三个参数是 socket 而非 response，
      // 误用 res.writeHead 会抛未捕获异常直接终止 dev server（未登录时 /ws/notify/ 返回 401 即可复现）
      if (typeof res.writeHead === 'function') {
        if (!res.headersSent) {
          res.writeHead(500, {
            'Content-Type': 'application/json',
          });
          res.end(JSON.stringify({ error: 'Proxy error' }));
        }
      } else if (typeof res.destroy === 'function') {
        res.destroy();
      }
    },
    // 添加连接配置
    timeout: 30000,
    proxyTimeout: 30000
  }))
};
