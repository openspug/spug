from django.urls import path

from .views import *

urlpatterns = [
    path('', NotifyView.as_view()),
]
