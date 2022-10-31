# Copyright: (c) OpenSpug Organization. https://github.com/openspug/spug
# Copyright: (c) <spug.dev@gmail.com>
# Released under the AGPL-3.0 License.
from apps.config.models import Config, Service, Environment, ConfigHistory
from apps.app.models import App
from libs.utils import SpugError, human_datetime
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
            for item in Config.objects.filter(type='app', o_id__in=app_ids, env_id=env_id) \
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


def update_config_by_var(val):
    try:
        keys, value = val.split('=', 1)
        key, env_key, var = keys.split(':')
    except ValueError:
        raise SpugError('通过SPUG_SET动态更新配置出错，请遵循export SPUG_SET=应用/服务标识符:环境标识符:变量名=变量值')
    env = Environment.objects.filter(key=env_key).first()
    if not env:
        raise SpugError(f'通过SPUG_SET动态更新配置出错，未找到环境标识符{env_key}')
    app = App.objects.filter(key=key).first()
    if app:
        query = dict(key=var, type='app', o_id=app.id, env_id=env.id)
    else:
        service = Service.objects.filter(key=key).first()
        if not service:
            raise SpugError(f'通过SPUG_SET动态更新配置出错，未找到应用或服务标识符{key}')
        query = dict(key=var, type='src', o_id=service.id, env_id=env.id)

    config = Config.objects.filter(**query).first()
    if config:
        if config.value != value:
            old_value = config.value
            config.value = value
            config.updated_at = human_datetime()
            config.updated_by_id = None
            config.desc = '通过SPUG_SET动态更新'
            ConfigHistory.objects.create(
                action='2',
                old_value=old_value,
                **config.to_dict(excludes=('id',)))
    else:
        config = Config.objects.create(
            value=value,
            desc='通过SPUG_SET动态创建',
            updated_at=human_datetime(),
            updated_by_id=None,
            **query
        )
        ConfigHistory.objects.create(action='1', **config.to_dict(excludes=('id',)))
