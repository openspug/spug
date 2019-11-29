from django.conf.urls import url
from django.urls import path

from .views import *

urlpatterns = [
    url(r'^$', Schedule.as_view()),
    path('<int:t_id>/', ScheduleInfo.as_view()),
]
