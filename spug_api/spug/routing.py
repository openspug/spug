# spug/routing.py
from channels.routing import ProtocolTypeRouter
from consumer import routing

application = ProtocolTypeRouter({
    'websocket': routing.ws_router
})