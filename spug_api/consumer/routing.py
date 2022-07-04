# Copyright: (c) OpenSpug Organization. https://github.com/openspug/spug
# Copyright: (c) <spug.dev@gmail.com>
# Released under the AGPL-3.0 License.
from django.urls import path
from channels.routing import URLRouter
from consumer.consumers import *

ws_router = URLRouter([
    path('ws/ssh/<int:id>/', SSHConsumer),
    path('ws/subscribe/<str:token>/', PubSubConsumer),
    path('ws/<str:module>/<str:token>/', ComConsumer),
    path('ws/notify/', NotifyConsumer),
])
