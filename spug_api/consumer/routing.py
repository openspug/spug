# consumer/routing.py
from django.urls import path
from channels.routing import URLRouter
from consumer.consumers import SSHConsumer, PubSubConsumer, ComConsumer, NotifyConsumer

# 关键：暂时去掉 AuthMiddlewareStack 以确保能绕过 Django 模型加载顺序问题
# 我们的 BaseConsumer 已经自己处理了 Token 校验，所以去掉这个 Stack 是安全的
ws_router = URLRouter([
    path('ws/ssh/<int:id>/', SSHConsumer),
    path('ws/subscribe/<str:token>/', PubSubConsumer),
    path('ws/<str:module>/<str:token>/', ComConsumer),
    path('ws/notify/', NotifyConsumer),
])