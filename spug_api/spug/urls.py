"""spug URL Configuration
# Copyright: (c) OpenSpug Organization. https://github.com/openspug/spug
# Copyright: (c) <spug.dev@gmail.com>
# Released under the MIT License.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/2.2/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.urls import path, include

urlpatterns = [
    path('account/', include('apps.account.urls')),
    path('host/', include('apps.host.urls')),
    path('exec/', include('apps.exec.urls')),
    path('schedule/', include('apps.schedule.urls')),
    path('monitor/', include('apps.monitor.urls')),
    path('alarm/', include('apps.alarm.urls')),
    path('setting/', include('apps.setting.urls')),
    path('config/', include('apps.config.urls')),
    path('app/', include('apps.app.urls')),
    path('deploy/', include('apps.deploy.urls')),
    path('home/', include('apps.home.urls')),
    path('notify/', include('apps.notify.urls')),
    path('apis/', include('apps.apis.urls')),
]
