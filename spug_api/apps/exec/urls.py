from django.conf.urls import url

from .views import *

urlpatterns = [
    url(r'template/$', TemplateView.as_view()),
]
