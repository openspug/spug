# Copyright: (c) OpenSpug Organization. https://github.com/openspug/spug
# Copyright: (c) <spug.dev@gmail.com>
# Released under the MIT License.
from channels.generic.websocket import WebsocketConsumer
from django_redis import get_redis_connection
from apps.setting.utils import AppSetting
from apps.host.models import Host
from threading import Thread
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

    def receive(self, **kwargs):
        response = self.rds.blpop(self.token, timeout=5)
        while response:
            self.send(text_data=response[1].decode())
            response = self.rds.blpop(self.token, timeout=5)
        self.send(text_data='pong')


class SSHConsumer(WebsocketConsumer):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        kwargs = self.scope['url_route']['kwargs']
        self.token = kwargs['token']
        self.id = kwargs['id']
        self.chan = None
        self.ssh = None

    def loop_read(self):
        while True:
            data = self.chan.recv(32 * 1024)
            # print('read: {!r}'.format(data))
            if not data:
                self.close(3333)
                break
            self.send(bytes_data=data)

    def receive(self, text_data=None, bytes_data=None):
        data = text_data or bytes_data
        if data:
            data = json.loads(data)
            # print('write: {!r}'.format(data))
            resize = data.get('resize')
            if resize and len(resize) == 2:
                self.chan.resize_pty(*resize)
            else:
                self.chan.send(data['data'])

    def disconnect(self, code):
        self.chan.close()
        self.ssh.close()
        # print('Connection close')

    def connect(self):
        self.accept()
        self.send(bytes_data=b'Connecting ...\r\n')
        host = Host.objects.filter(pk=self.id).first()
        if not host:
            self.send(text_data='Unknown host\r\n')
            self.close()
        try:
            self.ssh = host.get_ssh(AppSetting.get('private_key')).get_client()
        except Exception as e:
            self.send(bytes_data=f'Exception: {e}\r\n'.encode())
            self.close()
        self.chan = self.ssh.invoke_shell(term='xterm')
        self.chan.transport.set_keepalive(30)
        Thread(target=self.loop_read).start()
