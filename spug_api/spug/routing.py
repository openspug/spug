from channels.routing import ProtocolTypeRouter, ChannelNameRouter, URLRouter
from consumer import routing, executors

application = ProtocolTypeRouter({
    'channel': ChannelNameRouter({
        'ssh_exec': executors.SSHExecutor,
    }),
    'websocket': URLRouter(
        routing.websocket_urlpatterns
    )
})
