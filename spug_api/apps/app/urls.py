# Copyright: (c) OpenSpug Organization. https://github.com/openspug/spug
# Copyright: (c) <spug.dev@gmail.com>
# Released under the MIT License.
from django.urls import path

from .views import *

urlpatterns = [
    path('', AppView.as_view()),
    path('deploy/', DeployView.as_view()),
    path('deploy/<int:d_id>/versions/', get_versions),
]
