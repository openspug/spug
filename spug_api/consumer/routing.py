# Copyright: (c) OpenSpug Organization. https://github.com/openspug/spug
# Copyright: (c) <spug.dev@gmail.com>
# Released under the AGPL-3.0 License.
from django.urls import path
from channels.routing import URLRouter
from consumer.consumers import *

ws_router = URLRouter([
    path('ws/ssh/<int:id>/', SSHConsumer.as_asgi()),
    path('ws/subscribe/<str:token>/', PubSubConsumer.as_asgi()),
    path('ws/<str:module>/<str:token>/', ComConsumer.as_asgi()),
    path('ws/notify/', NotifyConsumer.as_asgi()),
])
