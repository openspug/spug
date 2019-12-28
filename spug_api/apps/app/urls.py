from django.urls import path

from .views import *

urlpatterns = [
    path('', AppView.as_view()),
    path('deploy/', DeployView.as_view()),
    path('deploy/<int:d_id>/versions/', get_versions),
]
