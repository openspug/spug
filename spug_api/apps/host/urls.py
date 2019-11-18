from django.conf.urls import url

from .views import *

urlpatterns = [
    url(r'^$', HostView.as_view()),
]
