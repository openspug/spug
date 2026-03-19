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
        
        # 解析 Token
        token = parse_qs(query_string).get('x-token', [''])[0]
        
        # 调试日志：查看握手时拿到的 Token
        print(f"DEBUG: WebSocket 尝试连接, Token: {token}")

        if token and len(token) == 32:
            user = User.objects.filter(access_token=token).first()
            if user and user.token_expired >= time.time() and user.is_active:
                # --- 修复点：直接移除 IP 绑定校验，只保留用户赋值 ---
                self.user = user
                print(f"DEBUG: 用户 {user.nickname} 验证通过")
                
                if hasattr(self, 'init'):
                    self.init()
                return None
            else:
                print(f"DEBUG: Token 无效或已过期")
        else:
            print(f"DEBUG: 未解析到合法 Token")
            
        self.close_with_message('用户身份验证失败，请重新登录或刷新页面。')