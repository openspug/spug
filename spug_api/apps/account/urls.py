# Copyright: (c) OpenSpug Organization. https://github.com/openspug/spug
# Copyright: (c) <spug.dev@gmail.com>
# Released under the MIT License.
from django.conf.urls import url

from apps.account.views import *

urlpatterns = [
    url(r'^login/', login),
    url(r'^logout/', logout),
    url(r'^user/$', UserView.as_view()),
    url(r'^role/$', RoleView.as_view()),
    url(r'^self/$', SelfView.as_view()),
]
