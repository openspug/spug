# Copyright: (c) OpenSpug Organization. https://github.com/openspug/spug
# Copyright: (c) <spug.dev@gmail.com>
# Released under the MIT License.
from django.urls import path

from .views import *

urlpatterns = [
    path('', Schedule.as_view()),
    path('<int:h_id>/', ScheduleInfo.as_view()),
    path('<int:t_id>/history/', HistoryView.as_view()),
]
