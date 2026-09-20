# Copyright: (c) OpenSpug Organization. https://github.com/openspug/spug
# Copyright: (c) <spug.dev@gmail.com>
# Released under the AGPL-3.0 License.
from django.urls import path

from apps.apis import config
from apps.apis import deploy
from apps.apis import exec
from apps.apis import pipeline
from apps.apis import host

urlpatterns = [
    path('config/', config.get_configs),
    path('deploy/<int:deploy_id>/<str:kind>/', deploy.auto_deploy),
    path('exec/result/<str:token>/', exec.result),
    path('exec/<int:template_id>/', exec.trigger),
    path('pipeline/result/<str:token>/', pipeline.result),
    path('pipeline/<int:pipeline_id>/', pipeline.trigger),
    path('host/', host.get_inventory),
]
