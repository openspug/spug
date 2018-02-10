from flask import Blueprint, request
from libs.tools import json_response, JsonParser
from apps.configuration.models import Service, ConfigKey, AppConfigRel
from apps.deploy.models import App
from libs.decorators import require_permission
from public import db


blueprint = Blueprint(__name__, __name__)


@blueprint.route('/', methods=['GET'])
@require_permission('config_service_view')
def get():
    group = request.args.get('group')
    server_query = Service.query
    if group:
        services = server_query.filter_by(group=group).all()
    else:
        services = server_query.all()
    return json_response(services)


@blueprint.route('/', methods=['POST'])
@require_permission('config_service_add')
def post():
    form, error = JsonParser('name', 'identify', 'desc', 'group').parse()
    if error is None:
        Service(**form).save()
        return json_response()
    return json_response(message=error)


@blueprint.route('/<int:ser_id>', methods=['PUT'])
@require_permission('config_service_edit')
def put(ser_id):
    form, error = JsonParser('name', 'identify', 'desc', 'group').parse()
    if error is None:
        Service.query.get_or_404(ser_id).update(**form)
        return json_response()
    return json_response(message=error)


@blueprint.route('/<int:ser_id>', methods=['DELETE'])
@require_permission('config_service_del')
def delete(ser_id):
    service = Service.query.get_or_404(ser_id)
    rel = AppConfigRel.query.filter_by(d_id=ser_id, d_type='ser').first()
    if rel:
        rel_app = App.query.get_or_404(rel.s_id)
        return json_response(message='应用 <%s> 引用了该服务，请解除关联后再尝试删除该服务！' % rel_app.name)
    if ConfigKey.query.filter_by(owner_id=ser_id, owner_type='ser').count():
        return json_response(message='为了安全，请删除该服务下的所有配置后再尝试删除该服务！')
    service.delete()
    return json_response()


@blueprint.route('/groups/', methods=['GET'])
@require_permission('config_service_view | config_service_add | config_service_edit')
def fetch_groups():
    service_group = db.session.query(Service.group.distinct().label('group')).all()
    return json_response([x.group for x in service_group])