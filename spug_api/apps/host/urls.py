# Copyright: (c) OpenSpug Organization. https://github.com/openspug/spug
# Copyright: (c) <spug.dev@gmail.com>
# Released under the AGPL-3.0 License.
from django.urls import path

from apps.host.views import *
from apps.host.group import GroupView

urlpatterns = [
    path('', HostView.as_view()),
    path('group/', GroupView.as_view()),
    path('import/', post_import),
    path('parse/', post_parse),
]
