# Copyright: (c) OpenSpug Organization. https://github.com/openspug/spug
# Copyright: (c) <spug.dev@gmail.com>
# Released under the AGPL-3.0 License.
from django.urls import path

from apps.exec.views import TemplateView, TaskView, handle_terminate
from apps.exec.transfer import TransferView

urlpatterns = [
    path('template/', TemplateView.as_view()),
    path('do/', TaskView.as_view()),
    path('transfer/', TransferView.as_view()),
    path('terminate/', handle_terminate),
]
