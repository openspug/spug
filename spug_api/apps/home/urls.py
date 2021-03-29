# Copyright: (c) OpenSpug Organization. https://github.com/openspug/spug
# Copyright: (c) <spug.dev@gmail.com>
# Released under the AGPL-3.0 License.
from django.urls import path

from .views import *
from apps.home.notice import NoticeView
from apps.home.navigation import NavView

urlpatterns = [
    path('statistic/', get_statistic),
    path('alarm/', get_alarm),
    path('deploy/', get_deploy),
    path('request/', get_request),
    path('notice/', NoticeView.as_view()),
    path('navigation/', NavView.as_view()),
]
