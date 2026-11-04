# Copyright: (c) OpenSpug Organization. https://github.com/openspug/spug
# Copyright: (c) <spug.dev@gmail.com>
# Released under the AGPL-3.0 License.
from django.conf import settings
from django_redis import get_redis_connection
from asgiref.sync import async_to_sync
from apps.host.models import Host
from consumer.utils import BaseConsumer
from apps.account.utils import has_host_perm
from libs.utils import str_decode
from socket import timeout
from threading import Lock
from paramiko.ssh_exception import SSHException
import codecs
import json


class ComConsumer(BaseConsumer):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.key = None
        self.rds = None
        self.index = None

    def init(self):
        # scope is only available after the connection is accepted (channels 3+)
        token = self.scope['url_route']['kwargs']['token']
        module = self.scope['url_route']['kwargs']['module']
        if module == 'build':
            self.key = f'{settings.BUILD_KEY}:{token}'
        elif module == 'request':
            self.key = f'{settings.REQUEST_KEY}:{token}'
        elif module in ('pipeline', 'host', 'raw'):
            # the token already is the full redis key
            self.key = token
        else:
            raise TypeError(f'unknown module for {module}')
        self.rds = get_redis_connection()

    def disconnect(self, code):
        self.stop_reader()
        if self.rds and self._reader is None:
            self.rds.close()

    def get_response(self, index):
        counter = 0
        while counter < 30 and not self.closed:
            response = self.rds.lindex(self.key, index)
            if response:
                return response.decode()
            counter += 1
            if self._stop_event.wait(0.2):
                return

    def receive(self, text_data='', **kwargs):
        if not self.rds:
            return
        if text_data.isdigit() and self._reader is None:
            self.index = int(text_data)
            self.start_reader(self.loop_read)

    def loop_read(self):
        try:
            while not self.closed:
                response = self.get_response(self.index)
                if response:
                    self.index += 1
                    self.send(text_data=response)
                else:
                    self.send(text_data='pong')
        finally:
            self.rds.close()


class SSHConsumer(BaseConsumer):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.id = None
        self.chan = None
        self.ssh = None
        self._ssh_lock = Lock()

    def loop_read(self):
        is_ready, buf_size = False, 4096
        decoder = codecs.getincrementaldecoder('utf-8')()
        try:
            while not self.closed:
                try:
                    data = self.chan.recv(buf_size)
                except timeout:
                    continue
                if not data:
                    break
                # Flush regularly even when the host never stops producing output.
                while len(data) < 32 * 1024 and not self.closed and self.chan.recv_ready():
                    data += self.chan.recv(buf_size)
                pending = decoder.getstate()[0]
                try:
                    text = decoder.decode(data)
                except UnicodeDecodeError:
                    decoder = codecs.getincrementaldecoder('gbk')(errors='ignore')
                    text = decoder.decode(pending + data)
                if not text:
                    continue

                if not is_ready:
                    self.send(text_data='\033[2J\033[3J\033[1;1H')
                    is_ready = True
                self.send(text_data=text)
        finally:
            self.close_ssh()

    def receive(self, text_data=None, bytes_data=None):
        data = text_data or bytes_data
        if data and self.chan:
            data = json.loads(data)
            # print('write: {!r}'.format(data))
            resize = data.get('resize')
            try:
                if resize and len(resize) == 2:
                    self.chan.resize_pty(*resize)
                else:
                    self.chan.sendall(data['data'])
            except (OSError, EOFError, SSHException):
                self.close(3333)

    def disconnect(self, code):
        self.close_ssh()
        self.stop_reader()

    def close_ssh(self):
        with self._ssh_lock:
            if self.chan:
                self.chan.close()
            if self.ssh:
                self.ssh.close()

    def init(self):
        self.id = self.scope['url_route']['kwargs']['id']
        if has_host_perm(self.user, self.id):
            self.send(text_data='\r\n正在连接至主机 ...')
            host = Host.objects.filter(pk=self.id).first()
            if not host:
                return self.close_with_message('未找到指定主机，请刷新页面重试。')

            try:
                self.ssh = host.get_ssh().get_client()
                if self.closed:
                    return self.disconnect(1006)
                self.chan = self.ssh.invoke_shell(term='xterm')
                self.chan.settimeout(1)
                self.chan.transport.set_keepalive(30)
            except Exception as e:
                if not self.closed:
                    self.close_with_message(f'连接主机失败: {e}')
                return self.disconnect(3333)

            if self.closed:
                return self.disconnect(1006)
            self.start_reader(self.loop_read)
        else:
            self.close_with_message('你当前无权限操作该主机，请联系管理员授权。')


class NotifyConsumer(BaseConsumer):
    def init(self):
        async_to_sync(self.channel_layer.group_add)('notify', self.channel_name)

    def disconnect(self, code):
        async_to_sync(self.channel_layer.group_discard)('notify', self.channel_name)

    def receive(self, **kwargs):
        self.send(text_data='pong')

    def notify_message(self, event):
        self.send(text_data=json.dumps(event))


class PubSubConsumer(BaseConsumer):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.token = None
        self.rds = None
        self.p = None

    def init(self):
        self.token = self.scope['url_route']['kwargs']['token']
        self.rds = get_redis_connection()
        self.p = self.rds.pubsub(ignore_subscribe_messages=True)
        self.p.subscribe(self.token)

    def disconnect(self, code):
        self.stop_reader()
        if self._reader is None:
            if self.p:
                self.p.close()
            if self.rds:
                self.rds.close()

    def receive(self, **kwargs):
        if not self.p:
            return
        self.start_reader(self.loop_read)

    def loop_read(self):
        try:
            while not self.closed:
                response = self.p.get_message(timeout=1)
                if response:
                    self.send(text_data=str_decode(response['data']))
                else:
                    self.send(text_data='pong')
        finally:
            self.p.close()
            self.rds.close()
