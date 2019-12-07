from django.urls import path

from .views import *

urlpatterns = [
    path('', ConfigView.as_view()),
    path('environment/', EnvironmentView.as_view()),
    path('service/', ServiceView.as_view()),
    path('history/', HistoryView.as_view()),
]
