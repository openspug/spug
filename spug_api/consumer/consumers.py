# Copyright: (c) OpenSpug Organization. https://github.com/openspug/spug
# Copyright: (c) <spug.dev@gmail.com>
# Released under the AGPL-3.0 License.
from channels.generic.websocket import WebsocketConsumer
from django.conf import settings
from django_redis import get_redis_connection
from asgiref.sync import async_to_sync
from apps.host.models import Host
from apps.account.utils import has_host_perm
from threading import Thread
import time
import json


class ExecConsumer(WebsocketConsumer):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.token = self.scope['url_route']['kwargs']['token']
        self.rds = get_redis_connection()

    def connect(self):
        self.accept()

    def disconnect(self, code):
        self.rds.close()

    def get_response(self):
        response = self.rds.brpop(self.token, timeout=5)
        return response[1] if response else None

    def receive(self, **kwargs):
        response = self.get_response()
        while response:
            data = response.decode()
            self.send(text_data=data)
            response = self.get_response()
        self.send(text_data='pong')


class ComConsumer(WebsocketConsumer):
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

    def connect(self):
        self.accept()

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


class SSHConsumer(WebsocketConsumer):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.user = self.scope['user']
        self.id = self.scope['url_route']['kwargs']['id']
        self.chan = None
        self.ssh = None

    def loop_read(self):
        while True:
            data = self.chan.recv(32 * 1024)
            # print('read: {!r}'.format(data))
            if not data:
                self.close(3333)
                break
            try:
                text = data.decode()
            except UnicodeDecodeError:
                text = data.decode(encoding='GBK', errors='ignore')
            self.send(text_data=text)

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

    def connect(self):
        if has_host_perm(self.user, self.id):
            self.accept()
            self._init()
        else:
            self.close()

    def _init(self):
        self.send(text_data='\r\33[KConnecting ...\r')
        host = Host.objects.filter(pk=self.id).first()
        if not host:
            self.send(text_data='Unknown host\r\n')
            self.close()
        try:
            self.ssh = host.get_ssh().get_client()
        except Exception as e:
            self.send(text_data=f'Exception: {e}\r\n'.encode())
            self.close()
            return
        self.chan = self.ssh.invoke_shell(term='xterm')
        self.chan.transport.set_keepalive(30)
        Thread(target=self.loop_read).start()


class NotifyConsumer(WebsocketConsumer):
    def connect(self):
        async_to_sync(self.channel_layer.group_add)('notify', self.channel_name)
        self.accept()

    def disconnect(self, code):
        async_to_sync(self.channel_layer.group_discard)('notify', self.channel_name)

    def receive(self, **kwargs):
        self.send(text_data='pong')

    def notify_message(self, event):
        self.send(text_data=json.dumps(event))
