from django.conf.urls import url

from apps.account.views import *

urlpatterns = [
    url(r'^login/', login),
    url(r'^logout/', logout),
    url(r'^user/$', UserView.as_view()),
]
