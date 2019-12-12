from django.urls import path

from .views import *

urlpatterns = [
    path('', HostView.as_view()),
    path('ssh/<int:h_id>/', web_ssh),
]
