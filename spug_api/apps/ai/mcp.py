# Copyright: (c) OpenSpug Organization. https://github.com/openspug/spug
# Copyright: (c) <spug.dev@gmail.com>
# Released under the AGPL-3.0 License.
"""极简 MCP（Model Context Protocol）客户端。

仅支持两种部署形态：
- docker：在 spug 所在服务器上以 `docker run -i --rm 镜像` 启动容器，
  通过 stdio 按行交换 JSON-RPC 消息（MCP stdio transport）；
- http：Streamable HTTP 服务，通过 POST 交换 JSON-RPC，
  兼容 application/json 与 text/event-stream（SSE）两种响应格式。

只实现智能体需要的最小能力：initialize / tools/list / tools/call。
"""
from queue import Queue, Empty
from threading import Thread
import subprocess
import requests
import logging
import shlex
import json

PROTOCOL_VERSION = '2025-03-26'
CLIENT_INFO = {'name': 'spug', 'version': '4.0'}
MAX_OUTPUT = 4000   # 回传给模型的工具输出上限，避免撑爆上下文


class McpError(Exception):
    pass


class _StdioClient:
    """docker stdio 传输：按行读写 JSON-RPC。"""

    def __init__(self, server):
        # 镜像不存在时 docker 会自动拉取，首次测试可能耗时较长，
        # 建议提前在服务器上 docker pull 好镜像
        command = ['docker', 'run', '-i', '--rm']
        env = json.loads(server.env) if server.env else {}
        if not isinstance(env, dict):
            raise McpError('环境变量必须是 JSON 对象')
        for key, value in env.items():
            command.extend(['-e', f'{key}={value}'])
        if not server.image:
            raise McpError('未配置 Docker 镜像')
        command.append(server.image)
        if server.command:
            command.extend(shlex.split(server.command))
        self.timeout = server.timeout or 60
        self._id = 0
        try:
            self.proc = subprocess.Popen(
                command, stdin=subprocess.PIPE, stdout=subprocess.PIPE,
                stderr=subprocess.PIPE, text=True, encoding='utf-8', bufsize=1)
        except FileNotFoundError:
            raise McpError('未找到 docker 命令，请确认服务器已安装 docker')
        except Exception as e:
            raise McpError(f'启动容器失败: {e}')
        # 后台线程持续读取 stdout，主线程带超时地从队列取消息
        self.queue = Queue()
        self.reader = Thread(target=self._read_loop, daemon=True)
        self.reader.start()

    def _read_loop(self):
        try:
            for line in self.proc.stdout:
                line = line.strip()
                if line:
                    self.queue.put(line)
        except Exception:
            pass
        finally:
            self.queue.put(None)   # 进程退出信号

    def _send(self, message):
        try:
            self.proc.stdin.write(json.dumps(message, ensure_ascii=False) + '\n')
            self.proc.stdin.flush()
        except Exception as e:
            raise McpError(f'发送消息失败（容器可能已退出）: {self._stderr_hint() or e}')

    def _stderr_hint(self):
        if self.proc.poll() is None:
            return None
        try:
            return (self.proc.stderr.read() or '')[:300]
        except Exception:
            return None

    def request(self, method, params):
        self._id += 1
        rid = self._id
        self._send({'jsonrpc': '2.0', 'id': rid, 'method': method, 'params': params})
        while True:
            try:
                line = self.queue.get(timeout=self.timeout)
            except Empty:
                raise McpError(f'{method} 等待响应超时（{self.timeout}s）')
            if line is None:
                raise McpError(f'容器已退出: {self._stderr_hint() or "无错误输出"}')
            try:
                message = json.loads(line)
            except json.JSONDecodeError:
                continue   # 忽略非 JSON 的日志输出
            if message.get('id') != rid:
                continue   # 忽略通知与其他响应
            if message.get('error'):
                error = message['error']
                raise McpError(f"{method} 调用失败: {error.get('message') or error}")
            return message.get('result') or {}

    def notify(self, method, params=None):
        self._send({'jsonrpc': '2.0', 'method': method, 'params': params or {}})

    def close(self):
        try:
            self.proc.stdin.close()
        except Exception:
            pass
        try:
            self.proc.terminate()
            self.proc.wait(timeout=5)
        except Exception:
            try:
                self.proc.kill()
            except Exception:
                pass


class _HttpClient:
    """Streamable HTTP 传输：POST JSON-RPC，响应兼容 JSON 与 SSE。"""

    def __init__(self, server):
        if not server.url:
            raise McpError('未配置服务地址')
        self.url = server.url
        self.timeout = server.timeout or 60
        self.session_id = None
        self._id = 0
        self.headers = {'Content-Type': 'application/json',
                        'Accept': 'application/json, text/event-stream'}
        extra = json.loads(server.headers) if server.headers else {}
        if not isinstance(extra, dict):
            raise McpError('请求头必须是 JSON 对象')
        self.headers.update({str(k): str(v) for k, v in extra.items()})

    def _post(self, message):
        headers = dict(self.headers)
        if self.session_id:
            headers['Mcp-Session-Id'] = self.session_id
        try:
            res = requests.post(self.url, headers=headers, json=message, timeout=self.timeout)
        except Exception as e:
            raise McpError(f'请求失败: {e}')
        if res.status_code >= 400:
            raise McpError(f'HTTP {res.status_code}: {res.text[:200]}')
        sid = res.headers.get('Mcp-Session-Id')
        if sid:
            self.session_id = sid
        return res

    def request(self, method, params):
        self._id += 1
        rid = self._id
        res = self._post({'jsonrpc': '2.0', 'id': rid, 'method': method, 'params': params})
        content_type = (res.headers.get('Content-Type') or '').lower()
        message = None
        if 'text/event-stream' in content_type:
            res.encoding = 'utf-8'
            for line in res.text.splitlines():
                line = line.strip()
                if not line.startswith('data:'):
                    continue
                try:
                    data = json.loads(line[5:].strip())
                except json.JSONDecodeError:
                    continue
                if data.get('id') == rid:
                    message = data
                    break
        else:
            try:
                message = res.json()
            except ValueError:
                raise McpError(f'响应不是合法 JSON: {res.text[:200]}')
        if not message:
            raise McpError(f'{method} 未收到响应')
        if message.get('error'):
            error = message['error']
            raise McpError(f"{method} 调用失败: {error.get('message') or error}")
        return message.get('result') or {}

    def notify(self, method, params=None):
        try:
            self._post({'jsonrpc': '2.0', 'method': method, 'params': params or {}})
        except McpError:
            pass   # 部分实现对通知返回 4xx，不影响后续调用

    def close(self):
        pass


def _open(server):
    client = _StdioClient(server) if server.type == 'docker' else _HttpClient(server)
    try:
        client.request('initialize', {
            'protocolVersion': PROTOCOL_VERSION,
            'capabilities': {},
            'clientInfo': CLIENT_INFO,
        })
        client.notify('notifications/initialized')
        return client
    except Exception:
        client.close()
        raise


def list_tools(server):
    """连接 MCP 服务并返回工具清单：[{name, description, inputSchema}, ...]"""
    client = _open(server)
    try:
        result = client.request('tools/list', {})
        tools = []
        for item in result.get('tools') or []:
            tools.append({
                'name': item.get('name'),
                'description': (item.get('description') or '')[:500],
                'inputSchema': item.get('inputSchema') or {},
            })
        return tools
    finally:
        client.close()


def call_tool(server, name, arguments):
    """调用工具，返回 (文本结果, 是否错误)。文本超长时自动截断。"""
    client = _open(server)
    try:
        result = client.request('tools/call', {'name': name, 'arguments': arguments or {}})
        parts = []
        for item in result.get('content') or []:
            if item.get('type') == 'text':
                parts.append(item.get('text') or '')
            else:
                parts.append(json.dumps(item, ensure_ascii=False)[:500])
        text = '\n'.join(parts).strip() or '(无输出)'
        if len(text) > MAX_OUTPUT:
            text = text[:MAX_OUTPUT] + '\n...（输出已截断）'
        return text, bool(result.get('isError'))
    finally:
        client.close()


def test_server(server):
    """连接测试：成功返回工具清单，失败抛 McpError。"""
    try:
        return list_tools(server)
    except McpError:
        raise
    except Exception as e:
        logging.exception('mcp test failed')
        raise McpError(f'连接异常: {e}')
