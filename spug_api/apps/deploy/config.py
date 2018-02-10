# coding=utf-8
from public import db
from flask import Blueprint, abort
from libs.tools import json_response, JsonParser, Argument, AttrDict
from apps.deploy.models import Image, ImageConfig, App
from apps.configuration.models import ConfigKey, ConfigValue
from apps.deploy.utils import valid_app_setting
from libs.decorators import require_permission


blueprint = Blueprint(__name__, __name__)

args = AttrDict(
    id=Argument('id', type=int, help='丢失id！'),
    name=Argument('name', filter=lambda x: not x.startswith('__'), help='请输入非双下划线开头的变量名称！'),
    desc=Argument('desc', required=False),
    value=Argument('value', help='请输入变量的值！')
)


def type_id_to_model_instance(owner_type, owner_id):
    if owner_type == 'app':
        return App.query.get_or_404(owner_id)
    elif owner_type == 'img':
        return Image.query.get_or_404(owner_id)
    else:
        abort(404)


@blueprint.route('/image/<int:img_id>', methods=['GET'])
@require_permission('publish_image_var_view')
def get_image(img_id):
    configs = ImageConfig.query.filter_by(img_id=img_id).all()
    return json_response(configs)


@blueprint.route('/image/<int:img_id>', methods=['POST'])
@require_permission('publish_image_var_add')
def post_image(img_id):
    form, error = JsonParser(args.name, args.desc, args.value).parse()
    if error is None:
        if ImageConfig.query.filter_by(img_id=img_id, name=form.name).first():
            return json_response(message='已存在相同的变量名称！')
        ImageConfig(img_id=img_id, **form).save()
        return json_response()
    return json_response(message=error)


@blueprint.route('/image/<int:img_id>', methods=['PUT'])
@require_permission('publish_image_var_edit')
def put_image(img_id):
    form, error = JsonParser(args.id, args.name, args.desc, args.value).parse()
    if error is None:
        exists_config = ImageConfig.query.filter_by(img_id=img_id, name=form.name).first()
        if exists_config and exists_config.id != form.id:
            return json_response(message='已存在相同的变量名称！')
        config = ImageConfig.query.get_or_404(form.id)
        config.update(**form)
        return json_response()
    return json_response(message=error)


@blueprint.route('/image/<int:img_id>', methods=['DELETE'])
@require_permission('publish_image_var_del')
def delete_image(img_id):
    config = ImageConfig.query.get_or_404(img_id)
    config.delete()
    return json_response()


@blueprint.route('/app/<int:owner_id>/settings/', methods=['POST'])
def setting_post(owner_id):
    form, error = JsonParser(
        Argument('name', filter=lambda x: x in ['__MEM_LIMIT', '__NETWORK_MODE', '__EXPOSE_PORT', '__BIND_VOLUME', '__DNS_SERVER', '__HOST_NAME'],
                 help='无效的设置参数！'),
        Argument('value', type=dict),
        'desc').parse()
    if error is None:
        ok, message = valid_app_setting(form.name, form.value.values())
        if not ok:
            return json_response(message=message)
        values = form.pop('value')
        config_key = ConfigKey.query.filter_by(owner_type='app', owner_id=owner_id, name=form.name,
                                               type='system').first()
        if not config_key:
            config_key = ConfigKey(owner_type='app', owner_id=owner_id, type='system', **form).save()
        for env_id, value in values.items():
            config_value = ConfigValue.query.filter_by(env_id=env_id, key_id=config_key.id).first()
            if config_value:
                config_value.update(value=value)
            else:
                ConfigValue(key_id=config_key.id, env_id=env_id, value=value).save()
        return json_response()
    return json_response(message=error)


@blueprint.route('/app/<int:app_id>', methods=['GET'])
@require_permission('publish_app_ctr_view')
def get_app(app_id):
    keys = ConfigKey.query.filter_by(owner_id=app_id, owner_type='app', type='system').all()
    result = [x.to_json() for x in keys if not x.name.startswith('__')]  # 过滤容器设置的值（双下划线开头）
    values = ConfigValue.query.filter(ConfigValue.key_id.in_([x['id'] for x in result])).all() if result else []
    for key in result:
        key['value'] = {}
        for val in values:
            if val.key_id == key['id']:
                key['value'][val.env_id] = val.value
    return json_response(result)


@blueprint.route('/app/<int:app_id>', methods=['POST'])
@require_permission('publish_app_ctr_edit')
def post_app(app_id):
    form, error = JsonParser(args.name, 'desc', 'value').parse()
    if error is None:
        if ConfigKey.query.filter_by(owner_type='app', owner_id=app_id, type='system', name=form.name).first():
            return json_response(message='重复的变量名称！')
        values = form.pop('value')
        config_key = ConfigKey(owner_type='app', owner_id=app_id, type='system', **form).save()
        for k, v in values.items():
            ConfigValue(key_id=config_key.id, env_id=k, value=v).add()
        db.session.commit()
    return json_response(message=error)


@blueprint.route('/app/<int:key_id>', methods=['PUT'])
@require_permission('publish_app_ctr_edit')
def put_app(key_id):
    form, error = JsonParser(args.name, 'desc', 'value').parse()
    if error is None:
        config_key = ConfigKey.query.get_or_404(key_id)
        owner = App.query.get_or_404(config_key.owner_id)
        exists_config = ConfigKey.query.filter_by(owner_type='app', owner_id=owner.id, type='system', name=form.name).first()
        if exists_config and exists_config.id != key_id:
            return json_response(message='重复的变量名称！')
        for env_id, value in form.pop('value').items():
            config_value = ConfigValue.query.filter_by(env_id=env_id, key_id=config_key.id).first()
            if config_value:
                config_value.update(value=value)
            else:
                ConfigValue(key_id=config_key.id, env_id=env_id, value=value).save()
        config_key.update(**form)
    return json_response(message=error)