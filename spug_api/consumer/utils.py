# Copyright: (c) OpenSpug Organization. https://github.com/openspug/spug
# Copyright: (c) <spug.dev@gmail.com>
# Released under the AGPL-3.0 License.
from django.db import close_old_connections
from channels.generic.websocket import WebsocketConsumer
from apps.account.models import User
from apps.setting.utils import AppSetting
from libs.utils import get_request_real_ip
from urllib.parse import parse_qs
import time


def get_real_ip(headers):
    decode_headers = {k.decode(): v.decode() for k, v in headers}
    return get_request_real_ip(decode_headers)


class BaseConsumer(WebsocketConsumer):
    def __init__(self, *args, **kwargs):
        super(BaseConsumer, self).__init__(*args, **kwargs)
        self.user = None

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
