# Copyright: (c) OpenSpug Organization. https://github.com/openspug/spug
# Copyright: (c) <spug.dev@gmail.com>
# Released under the AGPL-3.0 License.
from django.urls import path

from .views import *

urlpatterns = [
    path('request/', RequestView.as_view()),
    path('request/upload/', do_upload),
    path('request/<int:r_id>/', RequestDetailView.as_view()),
]
