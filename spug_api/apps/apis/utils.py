# Copyright: (c) OpenSpug Organization. https://github.com/openspug/spug
# Copyright: (c) <spug.dev@gmail.com>
# Released under the AGPL-3.0 License.
from django.http.response import JsonResponse
from apps.setting.utils import AppSetting
from functools import wraps
import hmac
import json


def api_response(data='', error=None, status=200):
    return JsonResponse({'data': data, 'error': error}, status=status)


def api_key_required(func):
    """校验系统设置-开放服务中的访问凭据，支持请求头 X-Api-Key 或查询参数 apiKey"""

    @wraps(func)
    def wrapper(request, *args, **kwargs):
        api_key = AppSetting.get_default('api_key')
        token = request.headers.get('X-Api-Key') or request.GET.get('apiKey') or ''
        if not api_key or not hmac.compare_digest(str(api_key).encode(), token.encode()):
            return api_response(error='Invalid api key', status=401)
        return func(request, *args, **kwargs)

    return wrapper


def parse_json_body(request):
    if not request.body:
        return {}
    try:
        body = json.loads(request.body)
    except ValueError:
        return None
    return body if isinstance(body, dict) else None
