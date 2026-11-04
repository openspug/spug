# Copyright: (c) OpenSpug Organization. https://github.com/openspug/spug
# Copyright: (c) <spug.dev@gmail.com>
# Released under the AGPL-3.0 License.
from django.db import close_old_connections
from channels.consumer import get_handler_name
from channels.db import database_sync_to_async
from channels.generic.websocket import WebsocketConsumer
from autobahn.exception import Disconnected
from apps.account.models import User
from apps.setting.utils import AppSetting
from libs.utils import get_request_real_ip
from urllib.parse import parse_qs
from functools import partial
from threading import Event, Thread
import asyncio
import logging
import time


logger = logging.getLogger(__name__)


def get_real_ip(headers):
    decode_headers = {k.decode(): v.decode() for k, v in headers}
    return get_request_real_ip(decode_headers)


class BaseConsumer(WebsocketConsumer):
    def __init__(self, *args, **kwargs):
        super(BaseConsumer, self).__init__(*args, **kwargs)
        self.user = None
        # set once the peer has gone away, either because daphne delivered
        # websocket.disconnect or because a send() hit a closed protocol
        self.closed = False
        self._stop_event = Event()
        self._reader = None
        self._disconnected = False

    async def __call__(self, scope, receive, send):
        try:
            await super().__call__(scope, receive, send)
        finally:
            self.closed = True
            self._stop_event.set()
            # Cancellation can bypass websocket_disconnect (e.g. Daphne's timeout).
            if not self._disconnected and hasattr(self, 'base_send'):
                await database_sync_to_async(self.disconnect, thread_sensitive=False)(1006)
            # Wait without occupying a dispatch worker or blocking the event loop.
            deadline = asyncio.get_running_loop().time() + 2
            while self._reader and self._reader.is_alive():
                if asyncio.get_running_loop().time() >= deadline:
                    logger.warning('WebSocket reader did not stop within 2 seconds')
                    break
                await asyncio.sleep(0.01)

    @partial(database_sync_to_async, thread_sensitive=False)
    def dispatch(self, message):
        # Keep blocking SSH connects off asgiref's process-wide single thread.
        handler = getattr(self, get_handler_name(message), None)
        if handler:
            handler(message)
        else:
            raise ValueError('No handler for message type %s' % message['type'])

    def start_reader(self, target):
        if self._reader is None and not self.closed:
            self._reader = Thread(target=self._run_reader, args=(target,), daemon=True)
            self._reader.start()

    def _run_reader(self, target):
        try:
            target()
        except Exception:
            if not self.closed:
                logger.exception('WebSocket reader failed')
        finally:
            self.close(3333)

    def stop_reader(self):
        self.closed = True
        self._stop_event.set()

    def send(self, text_data=None, bytes_data=None, close=False):
        """
        Sends a reply, swallowing the race where the client has already closed the
        socket. When the browser closes a console/terminal the server side may still be
        inside receive() (streaming redis output, waiting on a pubsub message or
        replying 'pong'); autobahn then raises Disconnected("Attempt to send on a
        closed protocol"), which used to bubble up as "Exception inside application"
        and skip disconnect() cleanup. There is nobody left to talk to, so drop it.
        """
        if self.closed:
            return
        try:
            super().send(text_data=text_data, bytes_data=bytes_data, close=close)
        except Disconnected:
            self.closed = True
            self._stop_event.set()

    def close(self, code=None):
        if self.closed:
            return
        self.closed = True
        self._stop_event.set()
        try:
            super().close(code=code)
        except Disconnected:
            pass

    def websocket_disconnect(self, message):
        self.closed = True
        self._stop_event.set()
        try:
            super().websocket_disconnect(message)
        finally:
            self._disconnected = True

    def close_with_message(self, content):
        self.send(text_data=f'\r\n\x1b[31m{content}\x1b[0m\r\n')
        self.close()

    def connect(self):
        self.accept()
        close_old_connections()
        query_string = self.scope['query_string'].decode()
        x_real_ip = get_real_ip(self.scope['headers'])
        token = parse_qs(query_string).get('x-token', [''])[0]
        if token and len(token) == 32:
            user = User.objects.filter(access_token=token).first()
            if user and user.token_expired >= time.time() and user.is_active:
                if x_real_ip == user.last_ip or AppSetting.get_default('bind_ip') is False:
                    self.user = user
                    if hasattr(self, 'init'):
                        self.init()
                    return None
                self.close_with_message('触发登录IP绑定安全策略，请在系统设置/安全设置中查看配置。')
        self.close_with_message('用户身份验证失败，请重新登录或刷新页面。')
