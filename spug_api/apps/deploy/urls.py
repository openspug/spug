from django.urls import path

from .views import *

urlpatterns = [
    path('request/', RequestView.as_view()),
]
