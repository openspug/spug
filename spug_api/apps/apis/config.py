# Copyright: (c) OpenSpug Organization. https://github.com/openspug/spug
# Copyright: (c) <spug.dev@gmail.com>
# Released under the MIT License.
from django.http.response import HttpResponse
from django_redis import get_redis_connection
from apps.config.models import Config, Service, Environment
from apps.setting.utils import AppSetting
from apps.app.models import App
import json


def get_configs(request):
    data = {}
    app, env_id = _parse_params(request)
    if not app or not env_id:
        return HttpResponse('Invalid params', status=400)
    # app own configs
    for item in Config.objects.filter(type='app', o_id=app.id, env_id=env_id).only('key', 'value'):
        data[f'{app.key}_{item.key}'] = item.value

    # relation app public configs
    if app.rel_apps:
        app_ids = json.loads(app.rel_apps)
        if app_ids:
            id_key_map = {x.id: x.key for x in App.objects.filter(id__in=app_ids)}
            for item in Config.objects.filter(type='app', o_id__in=app_ids, env_id=env_id, is_public=True) \
                    .only('key', 'value'):
                key = f'{id_key_map[item.o_id]}_{item.key}'
                data[key] = item.value

    # relation service configs
    if app.rel_services:
        src_ids = json.loads(app.rel_services)
        if src_ids:
            id_key_map = {x.id: x.key for x in Service.objects.filter(id__in=src_ids)}
            for item in Config.objects.filter(type='src', o_id__in=src_ids, env_id=env_id).only('key', 'value'):
                key = f'{id_key_map[item.o_id]}_{item.key}'
                data[key] = item.value

    # format
    fmt = request.GET.get('format', 'kv')
    if fmt == 'kv':
        return _kv_response(data)
    elif fmt == 'json':
        return _json_response(data)
    else:
        return HttpResponse('Unsupported output format', status=400)


def _kv_response(data):
    output = ''
    for k, v in sorted(data.items()):
        output += f'{k} = {v}\r\n'
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
    return app, env_id
