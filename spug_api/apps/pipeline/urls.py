# Copyright: (c) OpenSpug Organization. https://github.com/openspug/spug
# Copyright: (c) <spug.dev@gmail.com>
# Released under the AGPL-3.0 License.
from django.urls import path

from apps.pipeline.views import PipeView, DoView

urlpatterns = [
    path('', PipeView.as_view()),
    path('do/', DoView.as_view()),
]
