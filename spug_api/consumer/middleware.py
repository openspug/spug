# Copyright: (c) OpenSpug Organization. https://github.com/openspug/spug
# Copyright: (c) <spug.dev@gmail.com>
# Released under the AGPL-3.0 License.
from django.db import close_old_connections
from channels.security.websocket import WebsocketDenier
from apps.account.models import User
from libs.utils import get_request_real_ip
from urllib.parse import parse_qs
import time


class AuthMiddleware:
    def __init__(self, application):
        self.application = application

    def __call__(self, scope):
        # Make sure the scope is of type websocket
        if scope["type"] != "websocket":
            raise ValueError(
                "You cannot use AuthMiddleware on a non-WebSocket connection"
            )
        headers = dict(scope.get('headers', []))
        is_ok, message = self.verify_user(scope, headers)
        if is_ok:
            return self.application(scope)
        else:
            print(message)
            return WebsocketDenier(scope)

    def get_real_ip(self, headers):
        decode_headers = {
            'x-forwarded-for': headers.get(b'x-forwarded-for', b'').decode(),
            'x-real-ip': headers.get(b'x-real-ip', b'').decode()
        }
        return get_request_real_ip(decode_headers)

    def verify_user(self, scope, headers):
        close_old_connections()
        query_string = scope['query_string'].decode()
        x_real_ip = self.get_real_ip(headers)
        token = parse_qs(query_string).get('x-token', [''])[0]
        if token and len(token) == 32:
            user = User.objects.filter(access_token=token).first()
            if user and x_real_ip == user.last_ip and user.token_expired >= time.time() and user.is_active:
                scope['user'] = user
                return True, None
            return False, f'Verify failed: {x_real_ip} <> {user.last_ip if user else None}'
        return False, 'Token is invalid'
