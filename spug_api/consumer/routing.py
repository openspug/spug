from django.urls import path
from .consumers import *

websocket_urlpatterns = [
    path('ws/exec/<str:token>/', ExecConsumer),
    path('ws/ssh/<str:token>/<int:id>/', SSHConsumer),
]
