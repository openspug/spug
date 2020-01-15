# Copyright: (c) OpenSpug Organization. https://github.com/openspug/spug
# Copyright: (c) <spug.dev@gmail.com>
# Released under the MIT License.
from django.urls import path

from apps.apis import config

urlpatterns = [
    path('config/', config.get_configs),
]
