# Copyright: (c) OpenSpug Organization. https://github.com/openspug/spug
# Copyright: (c) <spug.dev@gmail.com>
# Released under the AGPL-3.0 License.
from channels.routing import ProtocolTypeRouter, ChannelNameRouter
from consumer import routing, executors

application = ProtocolTypeRouter({
    'channel': ChannelNameRouter({
        'ssh_exec': executors.SSHExecutor,
    }),
    'websocket': routing.ws_router
})
