# Copyright: (c) OpenSpug Organization. https://github.com/openspug/spug
# Released under the AGPL-3.0 License.
import asyncio
import time
from concurrent.futures import ThreadPoolExecutor
from contextlib import asynccontextmanager
from queue import Empty, Queue
from socket import timeout
from threading import Event
from types import SimpleNamespace
from unittest.mock import Mock, patch

from channels.testing import WebsocketCommunicator
from django.test import SimpleTestCase, override_settings

from consumer.consumers import ComConsumer, NotifyConsumer, PubSubConsumer, SSHConsumer
from consumer.utils import BaseConsumer


class RedisStub:
    def __init__(self):
        self.rows = []
        self.messages = Queue()
        self.reading = Event()
        self.closed = Event()
        self.subscription_closed = Event()

    def lindex(self, key, index):
        self.reading.set()
        return self.rows[index] if index < len(self.rows) else None

    def pubsub(self, **kwargs):
        return SimpleNamespace(subscribe=Mock(), get_message=self.get_message,
                               close=self.subscription_closed.set)

    def get_message(self, timeout):
        self.reading.set()
        try:
            return {'data': self.messages.get(timeout=timeout)}
        except Empty:
            return None

    def close(self):
        self.closed.set()


class SSHChannelStub:
    def __init__(self):
        self.output = Queue()
        self.written = []
        self.closed = Event()
        self.reading = Event()
        self.continuous = False
        self.pending = b''
        self.transport = Mock()

    def recv(self, size):
        self.reading.set()
        if self.closed.is_set():
            return b''
        if self.continuous:
            return b'x' * size
        try:
            data = self.pending or self.output.get(timeout=0.02)
            self.pending = data[size:]
            return data[:size]
        except Empty:
            raise timeout()

    def recv_ready(self):
        return self.continuous or bool(self.pending) or not self.output.empty()

    def sendall(self, data):
        self.written.append(data)

    def settimeout(self, seconds):
        pass

    def close(self):
        self.closed.set()


@override_settings(CHANNEL_LAYERS={'default': {'BACKEND': 'channels.layers.InMemoryChannelLayer'}})
class WebSocketTests(SimpleTestCase):
    def setUp(self):
        self.redis_clients = []
        self.channel = SSHChannelStub()
        self.ssh = Mock()
        self.ssh.invoke_shell.return_value = self.channel
        self.user = SimpleNamespace(token_expired=time.time() + 3600, is_active=True,
                                    is_supper=True, last_ip='127.0.0.1')
        patches = [
            patch('consumer.utils.User.objects.filter', return_value=Mock(first=lambda: self.user)),
            patch('consumer.consumers.Host.objects.filter',
                  return_value=Mock(first=lambda: SimpleNamespace(
                      get_ssh=lambda: SimpleNamespace(get_client=lambda: self.ssh)))),
            patch('consumer.consumers.get_redis_connection', side_effect=self.make_redis),
        ]
        for item in patches:
            item.start()
            self.addCleanup(item.stop)

    def make_redis(self):
        client = RedisStub()
        self.redis_clients.append(client)
        return client

    async def wait_until(self, predicate, seconds=1):
        deadline = asyncio.get_running_loop().time() + seconds
        while not predicate():
            if asyncio.get_running_loop().time() >= deadline:
                self.fail('Timed out waiting for WebSocket processing')
            await asyncio.sleep(0.005)

    @asynccontextmanager
    async def connections(self):
        sockets = []

        async def connect(consumer, **kwargs):
            socket = WebsocketCommunicator(consumer, '/ws/?x-token=' + 'a' * 32,
                                           headers=[(b'x-real-ip', b'127.0.0.1')])
            socket.scope['url_route'] = {'kwargs': kwargs}
            sockets.append(socket)
            self.assertTrue((await socket.connect())[0])
            return socket

        try:
            yield connect
        finally:
            for socket in sockets:
                if not socket.future.done():
                    await socket.send_input({'type': 'websocket.disconnect', 'code': 1000})
            await asyncio.gather(*(socket.wait(timeout=3) for socket in sockets))

    async def test_idle_subscriptions_do_not_block_terminal_or_notify(self):
        # More subscriptions than dispatch workers must still leave input responsive.
        asyncio.get_running_loop().set_default_executor(ThreadPoolExecutor(max_workers=2))
        async with self.connections() as connect:
            for index in range(8):
                if index % 2:
                    consumer = PubSubConsumer()
                    socket = await connect(consumer, token=str(index))
                    await socket.send_to(text_data='ok')
                else:
                    consumer = ComConsumer()
                    socket = await connect(consumer, module='raw', token=str(index))
                    await socket.send_to(text_data='0')
            await self.wait_until(lambda: len(self.redis_clients) == 8 and
                                  all(x.reading.is_set() for x in self.redis_clients))
            terminal = await connect(SSHConsumer(), id=1)
            self.assertIn('正在连接', await terminal.receive_from(timeout=0.5))
            await terminal.send_json_to({'data': 'echo hello\n'})
            await self.wait_until(lambda: self.channel.written, seconds=0.5)
            self.assertEqual(self.channel.written, ['echo hello\n'])
            notify = await connect(NotifyConsumer())
            await notify.send_to(text_data='ping')
            self.assertEqual(await notify.receive_from(timeout=0.5), 'pong')
            await notify.disconnect(timeout=0.5)
        self.assertTrue(all(x.closed.is_set() for x in self.redis_clients))

    async def test_slow_connection_does_not_block_other_connections(self):
        started, release = Event(), Event()

        class SlowConsumer(BaseConsumer):
            def init(self):
                started.set()
                release.wait(2)

        async with self.connections() as connect:
            await connect(SlowConsumer())
            try:
                await self.wait_until(started.is_set)
                notify = await connect(NotifyConsumer())
                await notify.send_to(text_data='ping')
                self.assertEqual(await notify.receive_from(timeout=0.5), 'pong')
            finally:
                release.set()

    async def test_log_stream_resumes_at_index_and_stops_on_disconnect(self):
        consumer = ComConsumer()
        async with self.connections() as connect:
            socket = await connect(consumer, module='raw', token='log')
            await self.wait_until(lambda: bool(self.redis_clients))
            client = self.redis_clients[0]
            client.rows.extend([b'old', b'first', b'second'])
            await socket.send_to(text_data='1')
            self.assertEqual(await socket.receive_from(), 'first')
            self.assertEqual(await socket.receive_from(), 'second')
            # The client's pong acknowledgement must not start a second reader.
            await socket.send_to(text_data='3')
            client.rows.append(b'third')
            self.assertEqual(await socket.receive_from(), 'third')
        self.assertTrue(client.closed.is_set())
        self.assertFalse(consumer._reader.is_alive())

    async def test_pubsub_disconnect_and_cancellation_release_resources(self):
        for cancel in (False, True):
            consumer = PubSubConsumer()
            async with self.connections() as connect:
                socket = await connect(consumer, token='exec')
                await socket.send_to(text_data='ok')
                await self.wait_until(lambda: consumer.p is not None)
                client = self.redis_clients[-1]
                client.messages.put(b'output')
                self.assertEqual(await socket.receive_from(), 'output')
                if cancel:
                    socket.future.cancel()
            self.assertTrue(client.closed.is_set())
            self.assertTrue(client.subscription_closed.is_set())
            self.assertFalse(consumer._reader.is_alive())

    async def test_continuous_ssh_output_is_flushed_and_can_disconnect(self):
        self.channel.continuous = True
        consumer = SSHConsumer()
        async with self.connections() as connect:
            socket = await connect(consumer, id=1)
            self.assertIn('正在连接', await socket.receive_from())
            self.assertIn('\033[2J', await socket.receive_from())
            output = await socket.receive_from(timeout=0.5)
            self.assertGreater(len(output), 0)
            self.assertLessEqual(len(output), 32 * 1024)
        self.assertTrue(self.channel.closed.is_set())
        self.assertFalse(consumer._reader.is_alive())
        self.ssh.close.assert_called()

    async def test_ssh_write_timeout_closes_connection(self):
        self.channel.sendall = Mock(side_effect=timeout())
        async with self.connections() as connect:
            socket = await connect(SSHConsumer(), id=1)
            await socket.receive_from()
            await socket.send_json_to({'data': 'x' * 65536})
            self.assertEqual((await socket.receive_output())['type'], 'websocket.close')
        self.assertTrue(self.channel.closed.is_set())

    async def test_ssh_batch_boundary_preserves_chinese_output(self):
        for encoding in ('utf-8', 'gbk'):
            self.channel = SSHChannelStub()
            self.ssh.invoke_shell.return_value = self.channel
            expected = 'x' * 32767 + '中文结束'
            self.channel.output.put(expected.encode(encoding))
            async with self.connections() as connect:
                socket = await connect(SSHConsumer(), id=1)
                await socket.receive_from()
                await socket.receive_from()  # Initial clear-screen sequence.
                output = await socket.receive_from()
                output += await socket.receive_from()
                self.assertEqual(output, expected)

    async def test_cancelled_ssh_connect_closes_late_client(self):
        started, release = Event(), Event()

        def get_client():
            started.set()
            release.wait(2)
            return self.ssh

        host = SimpleNamespace(get_ssh=lambda: SimpleNamespace(get_client=get_client))
        with patch('consumer.consumers.Host.objects.filter', return_value=Mock(first=lambda: host)):
            consumer = SSHConsumer()
            async with self.connections() as connect:
                socket = await connect(consumer, id=1)
                try:
                    await self.wait_until(started.is_set)
                    socket.future.cancel()
                    await socket.wait()
                finally:
                    release.set()
                await self.wait_until(lambda: self.ssh.close.called)
            self.ssh.invoke_shell.assert_not_called()
            self.assertIsNone(consumer._reader)

    async def test_disconnect_before_subscribing_closes_redis(self):
        async with self.connections() as connect:
            consumer = PubSubConsumer()
            await connect(consumer, token='unused')
            await self.wait_until(lambda: consumer.p is not None)
        self.assertTrue(self.redis_clients[0].closed.is_set())
        self.assertTrue(self.redis_clients[0].subscription_closed.is_set())

    async def test_invalid_token_still_closes_without_starting_reader(self):
        self.user.token_expired = 0
        consumer = ComConsumer()
        async with self.connections() as connect:
            socket = await connect(consumer, module='raw', token='log')
            self.assertIn('用户身份验证失败', await socket.receive_from())
            self.assertEqual((await socket.receive_output())['type'], 'websocket.close')
        self.assertIsNone(consumer._reader)
        self.assertFalse(self.redis_clients)
