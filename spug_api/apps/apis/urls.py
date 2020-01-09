from django.urls import path

from apps.apis import config

urlpatterns = [
    path('config/', config.get_configs),
]
