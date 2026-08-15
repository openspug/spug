# Copyright: (c) OpenSpug Organization. https://github.com/openspug/spug
# Copyright: (c) <spug.dev@gmail.com>
# Released under the AGPL-3.0 License.
from django.utils.deprecation import MiddlewareMixin
from django.conf import settings
from .utils import json_response, get_request_real_ip
from apps.account.models import User
from apps.setting.utils import AppSetting
import traceback
import json
import time
import re


class HandleExceptionMiddleware(MiddlewareMixin):
    """
    处理试图函数异常
    """

    def process_exception(self, request, exception):
        traceback.print_exc()
        return json_response(error='Exception: %s' % exception)


class TranslateMiddleware(MiddlewareMixin):
    """
    当客户端请求头携带 X-Language: en 时，将响应中的错误消息以及模型选项的
    展示值（*_alias 字段）翻译为英文
    """
    # 粗筛：既无 *_alias 键也无 CJK 字符（U+4E00-U+9FFF 的 UTF-8 首字节为 E4-E9）的响应无需翻译，
    # 避免大列表接口在热路径上做整包 json 解析与递归遍历
    TRANSLATABLE_RE = re.compile(rb'_alias|[\xe4-\xe9]')

    def process_response(self, request, response):
        if request.headers.get('X-Language') != 'en':
            return response
        if response.get('Content-Type', '') != 'application/json':
            return response
        if not self.TRANSLATABLE_RE.search(response.content):
            return response
        try:
            from libs.locale import translate, translate_choice
            content = json.loads(response.content.decode())
        except Exception:
            return response

        changed = False
        error = content.get('error')
        if error and isinstance(error, str):
            translated = translate(error)
            if translated != error:
                content['error'] = translated
                changed = True

        def walk(node):
            nonlocal changed
            if isinstance(node, dict):
                for key, value in node.items():
                    if key.endswith('_alias') and isinstance(value, str):
                        translated = translate_choice(value)
                        if translated != value:
                            node[key] = translated
                            changed = True
                    else:
                        walk(value)
            elif isinstance(node, list):
                for item in node:
                    walk(item)

        try:
            walk(content.get('data'))
            if changed:
                response.content = json.dumps(content, ensure_ascii=False).encode()
        except Exception:
            traceback.print_exc()
        return response


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
            x_real_ip = get_request_real_ip(request.headers)
            user = User.objects.filter(access_token=access_token).first()
            if user and user.token_expired >= time.time() and user.is_active:
                if x_real_ip == user.last_ip or AppSetting.get_default('bind_ip') is False:
                    request.user = user
                    user.token_expired = time.time() + settings.TOKEN_TTL
                    user.save()
                    return None
        response = json_response(error="验证失败，请重新登录")
        response.status_code = 401
        return response
