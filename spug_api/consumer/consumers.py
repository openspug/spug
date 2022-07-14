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
from threading import Thread
import time
import json


class ComConsumer(BaseConsumer):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        token = self.scope['url_route']['kwargs']['token']
        module = self.scope['url_route']['kwargs']['module']
        if module == 'build':
            self.key = f'{settings.BUILD_KEY}:{token}'
        elif module == 'request':
            self.key = f'{settings.REQUEST_KEY}:{token}'
        elif module == 'host':
            self.key = token
        else:
            raise TypeError(f'unknown module for {module}')
        self.rds = get_redis_connection()

    def disconnect(self, code):
        self.rds.close()

    def get_response(self, index):
        counter = 0
        while counter < 30:
            response = self.rds.lindex(self.key, index)
            if response:
                return response.decode()
            counter += 1
            time.sleep(0.2)

    def receive(self, text_data='', **kwargs):
        if text_data.isdigit():
            index = int(text_data)
            response = self.get_response(index)
            while response:
                index += 1
                self.send(text_data=response)
                response = self.get_response(index)
        self.send(text_data='pong')


class SSHConsumer(BaseConsumer):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.id = self.scope['url_route']['kwargs']['id']
        self.chan = None
        self.ssh = None

    def loop_read(self):
        is_ready, data = False, b''
        while True:
            out = self.chan.recv(32 * 1024)
            if not out:
                self.close(3333)
                break
            data += out
            try:
                text = data.decode()
            except UnicodeDecodeError:
                try:
                    text = data.decode(encoding='GBK')
                except UnicodeDecodeError:
                    time.sleep(0.01)
                    if self.chan.recv_ready():
                        continue
                    text = data.decode(errors='ignore')

            if not is_ready:
                self.send(text_data='\033[2J\033[3J\033[1;1H')
                is_ready = True
            self.send(text_data=text)
            data = b''

    def receive(self, text_data=None, bytes_data=None):
        data = text_data or bytes_data
        if data and self.chan:
            data = json.loads(data)
            # print('write: {!r}'.format(data))
            resize = data.get('resize')
            if resize and len(resize) == 2:
                self.chan.resize_pty(*resize)
            else:
                self.chan.send(data['data'])

    def disconnect(self, code):
        if self.chan:
            self.chan.close()
        if self.ssh:
            self.ssh.close()

    def init(self):
        if has_host_perm(self.user, self.id):
            self.send(text_data='\r\n正在连接至主机 ...')
            host = Host.objects.filter(pk=self.id).first()
            if not host:
                return self.close_with_message('未找到指定主机，请刷新页面重试。')

            try:
                self.ssh = host.get_ssh().get_client()
            except Exception as e:
                return self.close_with_message(f'连接主机失败: {e}')

            self.chan = self.ssh.invoke_shell(term='xterm')
            self.chan.transport.set_keepalive(30)
            Thread(target=self.loop_read).start()
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
        self.token = self.scope['url_route']['kwargs']['token']
        self.rds = get_redis_connection()
        self.p = self.rds.pubsub(ignore_subscribe_messages=True)
        self.p.subscribe(self.token)

    def disconnect(self, code):
        self.p.close()
        self.rds.close()

    def receive(self, **kwargs):
        response = self.p.get_message(timeout=10)
        while response:
            data = str_decode(response['data'])
            self.send(text_data=data)
            response = self.p.get_message(timeout=10)
        self.send(text_data='pong')
