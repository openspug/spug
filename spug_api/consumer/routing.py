# consumer/routing.py
from django.urls import path
from channels.routing import URLRouter
from channels.auth import AuthMiddlewareStack # 这里导入是安全的
from consumer.consumers import SSHConsumer, PubSubConsumer, ComConsumer, NotifyConsumer

ws_router = AuthMiddlewareStack(
    URLRouter([
        path('ws/ssh/<int:id>/', SSHConsumer),
        path('ws/subscribe/<str:token>/', PubSubConsumer),
        path('ws/<str:module>/<str:token>/', ComConsumer),
        path('ws/notify/', NotifyConsumer),
    ])
)