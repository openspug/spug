from django.urls import path

from .views import *

urlpatterns = [
    path('', AppView.as_view()),
    path('<int:a_id>/versions/', get_versions),
]
