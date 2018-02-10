from flask import Blueprint, jsonify, abort, Response
from apps.deploy.models import History
from apps.configuration.models import ConfigKey, ConfigValue, AppConfigRel
from libs.tools import JsonParser, Argument
from apps.apis.utils import MapConfigValues

blueprint = Blueprint(__name__, __name__)


@blueprint.route('/<string:api_token>', methods=['GET'])
def get(api_token):
    form, error = JsonParser(Argument('format', default='json', filter=lambda x: x in ['json', 'kv'])).parse()
    if error is not None:
        return abort(400)
    hit = History.query.filter_by(api_token=api_token).order_by(History.created.desc()).first()
    if hit is None:
        return abort(403)
    # 获取自身的keys
    self_keys = ConfigKey.query.filter_by(owner_id=hit.app_id, owner_type='app').filter(
        ConfigKey.type.in_(('private', 'public'))).all()
    # 通过配置关系表获取关联的所有对象
    link_objs = AppConfigRel.query.filter_by(s_id=hit.app_id).all()
    # 获取关联的应用的public类型keys
    link_app_ids = [x.d_id for x in link_objs if x.d_type == 'app']
    link_app_keys = ConfigKey.query.filter(
            ConfigKey.owner_id.in_(link_app_ids),
            ConfigKey.owner_type == 'app',
            ConfigKey.type == 'public'
        ).all() if link_app_ids else []
    # 获取关联的服务的keys
    link_ser_ids = [x.d_id for x in link_objs if x.d_type == 'ser']
    link_ser_keys = ConfigKey.query.filter(
        ConfigKey.owner_id.in_(link_ser_ids),
        ConfigKey.owner_type == 'ser'
    ).all() if link_ser_ids else []
    # 获取key对应的values
    all_keys = sorted(list(self_keys) + list(link_app_keys) + list(link_ser_keys), key=lambda x: x.name)
    all_values = ConfigValue.query.filter(
        ConfigValue.key_id.in_([x.id for x in all_keys])
    ).all() if all_keys else []
    # 遍历key组合最终结果
    map_values = MapConfigValues(all_values, hit.env_id)
    if form.format == 'kv':
        result = ''
        for key in all_keys:
            result += '%s=%s\n' % (key.name, map_values.get(key.id))
        return Response(result)
    else:
        result = {}
        for key in all_keys:
            result[key.name] = map_values.get(key.id)
        return jsonify(result)








