"""
WSGI config for spug project.

It exposes the WSGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/2.2/howto/deployment/wsgi/
"""

import os

from django.core.wsgi import get_wsgi_application

try:
    from public import setting_overrides
    settings_path = 'public.setting_overrides'
except ImportError:
    settings_path = 'public.settings'


os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'spug.settings')

application = get_wsgi_application()
