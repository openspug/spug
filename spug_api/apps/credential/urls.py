# Copyright: (c) OpenSpug Organization. https://github.com/openspug/spug
# Copyright: (c) <spug.dev@gmail.com>
# Released under the AGPL-3.0 License.
from django.urls import path

from apps.credential.views import CredView, handle_check

urlpatterns = [
    path('', CredView.as_view()),
    path('check/', handle_check),
]
