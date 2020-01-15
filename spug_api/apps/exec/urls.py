# Copyright: (c) OpenSpug Organization. https://github.com/openspug/spug
# Copyright: (c) <spug.dev@gmail.com>
# Released under the MIT License.
from django.conf.urls import url

from .views import *

urlpatterns = [
    url(r'template/$', TemplateView.as_view()),
    url(r'do/$', do_task),
]
