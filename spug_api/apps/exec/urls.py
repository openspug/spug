# Copyright: (c) OpenSpug Organization. https://github.com/openspug/spug
# Copyright: (c) <spug.dev@gmail.com>
# Released under the AGPL-3.0 License.
from django.conf.urls import url

from apps.exec.views import TemplateView, TaskView, handle_terminate
from apps.exec.transfer import TransferView

urlpatterns = [
    url(r'template/$', TemplateView.as_view()),
    url(r'do/$', TaskView.as_view()),
    url(r'transfer/$', TransferView.as_view()),
    url(r'terminate/$', handle_terminate),
]
