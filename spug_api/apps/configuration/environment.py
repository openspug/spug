from flask import Blueprint, g
from libs.tools import json_response, JsonParser
from apps.configuration.models import Environment
from libs.decorators import require_permission

blueprint = Blueprint(__name__, __name__)


@blueprint.route('/', methods=['GET'])
@require_permission('config_environment_view | publish_app_ctr_view | publish_app_var_view')
def get():
    envs = Environment.query.all()
    return json_response(envs)


# 专为发布页面的选择环境提供的接口，需要发布权限，限制返回的环境列表
@blueprint.route('/with_publish_permission', methods=['GET'])
@require_permission('publish_app_publish_view')
def get_with_permission():
    envs = Environment.query.all()
    if not g.user.is_supper:
        env_ids = g.user.role.env_ids
        if env_ids:
            envs = Environment.query.filter(Environment.id.in_(env_ids.split(','))).all()
        else:
            envs = []
    return json_response(envs)


@blueprint.route('/', methods=['POST'])
@require_permission('config_environment_add')
def post():
    form, error = JsonParser('name', 'identify', 'desc', 'priority').parse()
    if error is None:
        env = Environment(**form)
        env.save()
        return json_response(env)
    return json_response(message=error)


@blueprint.route('/<int:env_id>', methods=['PUT'])
@require_permission('config_environment_edit')
def put(env_id):
    form, error = JsonParser('name', 'identify', 'desc', 'priority').parse()
    if error is None:
        env = Environment.query.get_or_404(env_id)
        env.update(**form)
        env.save()
        return json_response(env)
    return json_response(message=error)


@blueprint.route('/<int:env_id>', methods=['DELETE'])
@require_permission('config_environment_del')
def delete(env_id):
    # 需要大量的关联判断，临时关闭删除
    return json_response(message='为了安全，已暂时关闭删除环境功能！')
    #env = Environment.query.get_or_404(env_id)
    #env.delete()
    #return json_response()
