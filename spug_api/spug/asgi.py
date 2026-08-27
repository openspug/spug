# Copyright: (c) OpenSpug Organization. https://github.com/openspug/spug
# Copyright: (c) <spug.dev@gmail.com>
# Released under the AGPL-3.0 License.
"""
ASGI config for spug project.

Exposes both the HTTP application and the websocket routes defined in
consumer.routing, so `daphne spug.asgi:application` serves websockets.
"""

import os

from django.core.asgi import get_asgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'spug.settings')

# get_asgi_application() calls django.setup(); it must run before importing
# anything that touches models (consumer.routing imports consumers/models).
django_asgi_app = get_asgi_application()

from channels.routing import ProtocolTypeRouter  # noqa: E402
from consumer import routing  # noqa: E402

application = ProtocolTypeRouter({
    'http': django_asgi_app,
    'websocket': routing.ws_router,
})
