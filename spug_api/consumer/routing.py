# Copyright: (c) OpenSpug Organization. https://github.com/openspug/spug
# Copyright: (c) <spug.dev@gmail.com>
# Released under the AGPL-3.0 License.
from django.urls import path
from .consumers import *

websocket_urlpatterns = [
    path('ws/exec/<str:token>/', ExecConsumer),
    path('ws/ssh/<str:token>/<int:id>/', SSHConsumer),
]
