from django.urls import path

from .views import *

urlpatterns = [
    path('alarm/', AlarmView.as_view()),
    path('group/', GroupView.as_view()),
    path('contact/', ContactView.as_view()),
]
