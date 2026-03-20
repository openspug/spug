# Copyright: (c) OpenSpug Organization. https://github.com/openspug/spug
# Copyright: (c) <spug.dev@gmail.com>
# Released under the AGPL-3.0 License.
from channels.routing import ProtocolTypeRouter
from consumer import routing

application = ProtocolTypeRouter({
    'websocket': routing.ws_router
})
