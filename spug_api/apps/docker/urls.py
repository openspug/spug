from django.urls import path

from .views import (
    ActionView, ConfigView, ContainerView, CreateView, DiscoverView,
    LogStreamView, RemoveView, ResourceView, StatsView,
)


urlpatterns = [
    path('discover/', DiscoverView.as_view()),
    path('create/', CreateView.as_view()),
    path('remove/', RemoveView.as_view()),
    path('config/', ConfigView.as_view()),
    path('action/', ActionView.as_view()),
    path('resource/', ResourceView.as_view()),
    path('stats/', StatsView.as_view()),
    path('container/', ContainerView.as_view()),
    path('logs/', LogStreamView.as_view()),
]
