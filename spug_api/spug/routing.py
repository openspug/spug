# Copyright: (c) OpenSpug Organization. https://github.com/openspug/spug
# Copyright: (c) <spug.dev@gmail.com>
# Released under the AGPL-3.0 License.
from channels.routing import ProtocolTypeRouter, ChannelNameRouter
from consumer import routing, executors, consumers

application = ProtocolTypeRouter({
    'channel': ChannelNameRouter({
        'ssh_exec': executors.SSHExecutor,
        'notify_message': consumers.NotifyConsumer,
    }),
    'websocket': routing.ws_router
})
