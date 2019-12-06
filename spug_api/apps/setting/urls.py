from django.urls import path

from .views import *

urlpatterns = [
    path('', SettingView.as_view()),
]
