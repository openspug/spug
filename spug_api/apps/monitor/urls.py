from django.urls import path

from .views import *

urlpatterns = [
    path('', DetectionView.as_view()),
]
