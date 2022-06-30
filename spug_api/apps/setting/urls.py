# Copyright: (c) OpenSpug Organization. https://github.com/openspug/spug
# Copyright: (c) <spug.dev@gmail.com>
# Released under the AGPL-3.0 License.
# from django.urls import path
from django.conf.urls import url
from apps.setting.views import *
from apps.setting.user import UserSettingView

urlpatterns = [
    url(r'^$', SettingView.as_view()),
    url(r'^user/$', UserSettingView.as_view()),
    url(r'^ldap_test/$', ldap_test),
    url(r'^email_test/$', email_test),
    url(r'^mfa/$', MFAView.as_view()),
    url(r'^about/$', get_about)
]
