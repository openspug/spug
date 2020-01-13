from django.urls import path

from .views import *

urlpatterns = [
    path('statistic/', get_statistic),
    path('alarm/', get_alarm),
    path('deploy/', get_deploy),
    path('request/', get_request),
]
