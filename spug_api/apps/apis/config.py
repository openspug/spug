# Copyright: (c) OpenSpug Organization. https://github.com/openspug/spug
# Copyright: (c) <spug.dev@gmail.com>
# Released under the AGPL-3.0 License.
from django.http.response import HttpResponse
from django_redis import get_redis_connection
from apps.config.models import Environment
from apps.app.models import App
from apps.setting.utils import AppSetting
from apps.config.utils import compose_configs
import json


def get_configs(request):
    app, env_id, no_prefix = _parse_params(request)
    if not app or not env_id:
        return HttpResponse('Invalid params', status=400)

    configs = compose_configs(app, env_id, no_prefix)
    fmt = request.GET.get('format', 'kv')
    if fmt == 'kv':
        return _kv_response(configs)
    elif fmt == 'env':
        return _env_response(configs)
    elif fmt == 'json':
        return _json_response(configs)
    else:
        return HttpResponse('Unsupported output format', status=400)


def _kv_response(data):
    output = ''
    for k, v in sorted(data.items()):
        output += f'{k} = {v}\r\n'
    return HttpResponse(output, content_type='text/plain; charset=utf-8')


def _env_response(data):
    output = ''
    for k, v in sorted(data.items()):
        output += f'{k}={v}\n'
    return HttpResponse(output, content_type='text/plain; charset=utf-8')


def _json_response(data):
    data = dict(sorted(data.items()))
    return HttpResponse(json.dumps(data), content_type='application/json')


def _parse_params(request):
    app, env_id = None, None
    api_token = request.GET.get('apiToken')
    if api_token:
        rds = get_redis_connection()
        content = rds.get(api_token)
        if content:
            app_id, env_id = content.decode().split(',')
            app = App.objects.filter(pk=app_id).first()
    else:
        api_key = AppSetting.get_default('api_key')
        if api_key and request.GET.get('apiKey') == api_key:
            app_key = request.GET.get('app')
            env_key = request.GET.get('env')
            if app_key and env_key:
                app = App.objects.filter(key=app_key).first()
                env = Environment.objects.filter(key=env_key).first()
                if env:
                    env_id = env.id
    return app, env_id, request.GET.get('noPrefix')
