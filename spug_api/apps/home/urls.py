# Copyright: (c) OpenSpug Organization. https://github.com/openspug/spug
# Copyright: (c) <spug.dev@gmail.com>
# Released under the MIT License.
from django.urls import path

from .views import *

urlpatterns = [
    path('statistic/', get_statistic),
    path('alarm/', get_alarm),
    path('deploy/', get_deploy),
    path('request/', get_request),
]
