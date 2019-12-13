from django.urls import path

from .views import *

urlpatterns = [
    path('', AppView.as_view()),
]
