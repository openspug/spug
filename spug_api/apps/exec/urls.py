# Copyright: (c) OpenSpug Organization. https://github.com/openspug/spug
# Copyright: (c) <spug.dev@gmail.com>
# Released under the AGPL-3.0 License.
from django.conf.urls import url

from .views import *

urlpatterns = [
    url(r'template/$', TemplateView.as_view()),
    url(r'history/$', get_histories),
    url(r'do/$', do_task),
]
