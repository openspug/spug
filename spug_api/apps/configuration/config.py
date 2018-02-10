from public import db
from flask import Blueprint, abort
from libs.tools import json_response, JsonParser, Argument
from apps.configuration.models import ConfigKey, ConfigValue, Service
from apps.deploy.models import App
from libs.decorators import require_permission

blueprint = Blueprint(__name__, __name__)


def type_id_to_model_instance(owner_type, owner_id):
    if owner_type == 'ser':
        return Service.query.get_or_404(owner_id)
    elif owner_type == 'app':
        return App.query.get_or_404(owner_id)
    else:
        abort(404)


def first_config_key(owner_type, owner_id, form):
    where = ConfigKey.query.filter_by(owner_type=owner_type, owner_id=owner_id, name=form.name)
    # 私有个公共属性之间不能相同
    if form.type in ['private', 'public']:
        where.filter(ConfigKey.type.in_(('private', 'public')))
    # 系统属性和服务配置不与自身已有的相同
    else:
        where.filter_by(type=form.type)
    return where.first()


@blueprint.route('/<int:owner_id>', methods=['GET'])
@require_permission('config_service_cfg_view | config_app_cfg_view')
def get(owner_id):
    form, error = JsonParser(
        Argument('owner_type', filter=lambda x: x in ['app', 'ser']),
        Argument('cfg_type', required=False)
    ).parse()
    if error is None:
        result = []
        keys = ConfigKey.query.filter_by(owner_id=owner_id, owner_type=form.owner_type)
        if form.cfg_type:
            keys = keys.filter_by(type=form.cfg_type).all()[:]
        else:
            keys = keys.filter(ConfigKey.type != 'system').all()[:]
        values = ConfigValue.query.filter(ConfigValue.key_id.in_([x.id for x in keys])).all() if keys else []
        for key in [x.to_json() for x in keys]:
            key['value'] = {}
            for val in values:
                if val.key_id == key['id']:
                    key['value'][val.env_id] = val.value
            result.append(key)
        return json_response(result)
    return json_response(message=error)


@blueprint.route('/<int:owner_id>', methods=['POST'])
@require_permission('config_service_cfg_add | config_app_cfg_add')
def post(owner_id):
    form, error = JsonParser(
        Argument('type', default='', filter=lambda x: x in ['private', 'public']),
        'owner_type', 'short_name', 'desc', 'value').parse()
    if error is None:
        owner = type_id_to_model_instance(form.owner_type, owner_id)
        form.owner_id = owner_id
        if form.type in ['private']:
            form.name = form.pop('short_name').upper()
        else:
            form.name = (owner.identify + '_' + form.pop('short_name')).upper()
        if first_config_key(form.owner_type, owner_id, form):
            return json_response(message='重复的变量名称！')
        values = form.pop('value')
        config = ConfigKey(**form).save()
        for k, v in values.items():
            ConfigValue(key_id=config.id, env_id=k, value=v).add()
        db.session.commit()
    return json_response(message=error)


@blueprint.route('/<int:cfg_id>', methods=['PUT'])
@require_permission('config_service_cfg_edit | config_app_cfg_edit')
def put(cfg_id):
    form, error = JsonParser(
        Argument('type', default='', filter=lambda x: x in ['private', 'public']),
        'short_name', 'desc', 'value').parse()
    if error is None:
        config_key = ConfigKey.query.get_or_404(cfg_id)
        owner = type_id_to_model_instance(config_key.owner_type, config_key.owner_id)
        if form.type in ['private']:
            form.name = form.pop('short_name').upper()
        else:
            form.name = (owner.identify + '_' + form.pop('short_name')).upper()
        exists_key = first_config_key(config_key.owner_type, config_key.owner_id, form)
        if exists_key and exists_key.id != cfg_id:
            return json_response(message='重复的变量名称！')
        for env_id, value in form.pop('value').items():
            config_value = ConfigValue.query.filter_by(env_id=env_id, key_id=config_key.id).first()
            if config_value:
                config_value.update(value=value)
            else:
                ConfigValue(key_id=config_key.id, env_id=env_id, value=value).save()
        config_key.update(**form)
        return json_response()
    return json_response(message=error)


@blueprint.route('/<int:cfg_id>', methods=['DELETE'])
@require_permission('config_service_cfg_del | config_app_cfg_del')
def delete(cfg_id):
    config = ConfigKey.query.get_or_404(cfg_id)
    config.delete()
    return json_response()
