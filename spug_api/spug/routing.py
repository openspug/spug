# spug/routing.py
from channels.routing import ProtocolTypeRouter, URLRouter
import consumer.routing

application = ProtocolTypeRouter({
    # 暂时移除 AuthMiddlewareStack，直接使用 URLRouter 测试
    'websocket': consumer.routing.ws_router
})