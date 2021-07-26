# Copyright: (c) OpenSpug Organization. https://github.com/openspug/spug
# Copyright: (c) <spug.dev@gmail.com>
# Released under the AGPL-3.0 License.
from apps.config.models import Config, Service
from apps.app.models import App
import json


def compose_configs(app, env_id, no_prefix=False):
    configs = dict()
    # app own configs
    for item in Config.objects.filter(type='app', o_id=app.id, env_id=env_id).only('key', 'value'):
        key = item.key if no_prefix else f'{app.key}_{item.key}'
        configs[key] = item.value

    # relation app public configs
    if app.rel_apps:
        app_ids = json.loads(app.rel_apps)
        if app_ids:
            id_key_map = {x.id: x.key for x in App.objects.filter(id__in=app_ids)}
            for item in Config.objects.filter(type='app', o_id__in=app_ids, env_id=env_id, is_public=True) \
                    .only('key', 'value'):
                key = item.key if no_prefix else f'{id_key_map[item.o_id]}_{item.key}'
                configs[key] = item.value

    # relation service configs
    if app.rel_services:
        src_ids = json.loads(app.rel_services)
        if src_ids:
            id_key_map = {x.id: x.key for x in Service.objects.filter(id__in=src_ids)}
            for item in Config.objects.filter(type='src', o_id__in=src_ids, env_id=env_id).only('key', 'value'):
                key = item.key if no_prefix else f'{id_key_map[item.o_id]}_{item.key}'
                configs[key] = item.value
    return configs
