# Copyright: (c) OpenSpug Organization. https://github.com/openspug/spug
# Copyright: (c) <spug.dev@gmail.com>
# Released under the AGPL-3.0 License.
from django.urls import path

from apps.pipeline.views import PipeView, DoView, HistoryView, handle_data_upload

urlpatterns = [
    path('', PipeView.as_view()),
    path('upload/', handle_data_upload),
    path('do/', DoView.as_view()),
    path('history/', HistoryView.as_view()),
    path('history/<int:h_id>/', HistoryView.as_view()),
]
