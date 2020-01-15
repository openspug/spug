# Copyright: (c) OpenSpug Organization. https://github.com/openspug/spug
# Copyright: (c) <spug.dev@gmail.com>
# Released under the MIT License.
from django.utils.deprecation import MiddlewareMixin
from django.conf import settings
from .utils import json_response
from apps.account.models import User
import traceback
import time


class HandleExceptionMiddleware(MiddlewareMixin):
    """
    处理试图函数异常
    """

    def process_exception(self, request, exception):
        traceback.print_exc()
        return json_response(error='Exception: %s' % exception)


class AuthenticationMiddleware(MiddlewareMixin):
    """
    登录验证
    """

    def process_request(self, request):
        if request.path in settings.AUTHENTICATION_EXCLUDES:
            return None
        if any(x.match(request.path) for x in settings.AUTHENTICATION_EXCLUDES if hasattr(x, 'match')):
            return None
        access_token = request.headers.get('x-token') or request.GET.get('x-token')
        if access_token and len(access_token) == 32:
            x_real_ip = request.headers.get('x-real-ip', '')
            user = User.objects.filter(access_token=access_token).first()
            if user and x_real_ip == user.last_ip and user.token_expired >= time.time() and user.is_active:
                request.user = user
                user.token_expired = time.time() + 8 * 60 * 60
                user.save()
                return None
        response = json_response(error="验证失败，请重新登录")
        response.status_code = 401
        return response
