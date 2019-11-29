from django.conf.urls import url

from .views import *

urlpatterns = [
    url(r'^$', Schedule.as_view()),
]
