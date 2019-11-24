from channels.generic.websocket import WebsocketConsumer
from django_redis import get_redis_connection


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
