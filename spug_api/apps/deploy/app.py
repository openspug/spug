from flask import Blueprint, request, g
from apps.deploy.models import App, AppHostRel, DeployMenu
from apps.configuration.models import ConfigKey, AppConfigRel, Environment
from apps.assets.models import Host
from libs.tools import json_response, JsonParser, Argument, AttrDict
from libs.utils import Container
from docker.errors import DockerException
from datetime import datetime
from public import db
from libs.decorators import require_permission
from apps.deploy.utils import get_built_in_menus

blueprint = Blueprint(__name__, __name__)

args = AttrDict(
    group=Argument('group', help='请选择分组名称！'),
    name=Argument('name', help='请输入应用名称！'),
    desc=Argument('desc', help='请输入应用描述！'),
    notify_way_id=Argument('notify_way_id', type=int, help='请选择通知方式！'),
    identify=Argument('identify', help='请输入应用标识！'),
    image_id=Argument('image_id', type=int, help='请选择应用使用的Docker镜像！')
)


@blueprint.route('/', methods=['GET'])
@require_permission('publish_app_view | config_app_view | publish_field_rel_view')
def get():
    group = request.args.get('group')
    query = App.query
    if group:
        query = query.filter_by(group=group)
    if g.user.is_supper:
        apps = query.all()
    else:
        app_ids = g.user.role.app_ids
        if app_ids:
            apps = query.filter(App.id.in_(app_ids.split(','))).all()
        else:
            apps = []
    data_list = []
    for i in apps:
        data = i.to_json()
        data['notify_way_name'] = i.notify_way.name if i.notify_way else ''
        data['images'] = i.image.name
        data_list.append(data)
    return json_response(data_list)


@blueprint.route('/', methods=['POST'])
@require_permission('publish_app_add')
def post():
    form, error = JsonParser(*args.values()).parse()
    if error is None:
        if App.query.filter_by(identify=form.identify).first():
            return json_response(message='应用标识不能重复！')
        app = App(**form)
        app.create_date = datetime.now()
        app.edit_date = datetime.now()
        app.save()
        if not g.user.is_supper:
            g.user.role.update(app_ids=g.user.role.app_ids + ',%d' % app.id)
        return json_response(app)
    return json_response(message=error)


@blueprint.route('/<int:app_id>', methods=['DELETE'])
@require_permission('publish_app_del')
def delete(app_id):
    app = App.query.get_or_404(app_id)
    if AppHostRel.query.filter_by(app_id=app_id).first():
        return json_response(message='请先取消与已发布主机的关联后再尝试删除应用！')
    rel = AppConfigRel.query.filter_by(d_id=app_id, d_type='app').first()
    if rel:
        rel_app = App.query.get_or_404(rel.s_id)
        return json_response(message='应用 <%s> 引用了该应用，请解除关联后再尝试删除该应用！' % rel_app.name)
    app_keys = ConfigKey.query.filter_by(owner_id=app_id, owner_type='app')
    if [x for x in app_keys.all() if x.type != 'system']:
        return json_response(message='为了安全，请删除该应用下的所有配置后再尝试删除该应用！')
    app_keys.delete()
    app.delete()
    return json_response()


@blueprint.route('/<int:app_id>', methods=['PUT'])
@require_permission('publish_app_edit')
def put(app_id):
    form, error = JsonParser(*args.values()).parse()
    if error is None:
        exists_record = App.query.filter_by(identify=form.identify).first()
        if exists_record and exists_record.id != app_id:
            return json_response(message='应用标识不能重复！')
        app = App.query.get_or_404(app_id)
        app.update(**form)
        app.save()
        return json_response(app)
    return json_response(message=error)


@blueprint.route('/<int:app_id>/bind/hosts', methods=['POST'])
@require_permission('publish_app_publish_view')
def bind_hosts(app_id):
    form, error = JsonParser('ids', 'env_id').parse()
    if error is None:
        pro = App.query.get_or_404(app_id)
        env = Environment.query.get_or_404(form.env_id)
        old_relationships = AppHostRel.query.filter_by(env_id=form.env_id, app_id=app_id).all()[:]
        for host_id in form.ids:
            rel = AppHostRel(env_id=form.env_id, app_id=app_id, host_id=host_id)
            if rel in old_relationships:
                old_relationships.remove(rel)
            else:
                rel.add()
        for old_rel in old_relationships:
            host = Host.query.get_or_404(old_rel.host_id)
            try:
                app_process = Container(host.docker_uri, '%s.%s' % (pro.identify, env.identify)).info
                if app_process:
                    return json_response(message='在主机 <%s> 上已经部署了该应用，请删除已部署的容器后再尝试解除关联！' % host.name)
            except DockerException:
                pass
            old_rel.delete(commit=False)
        db.session.commit()
        return json_response()
    return json_response(message=error)


@blueprint.route('/groups/', methods=['GET'])
@require_permission('publish_app_view')
def fetch_groups():
    apps = db.session.query(App.group.distinct().label('group')).all()
    return json_response([x.group for x in apps])


# 用户在发布详情页获取自定义的展示字段，需具有应用发布权限
@blueprint.route('/<int:app_id>/fields', methods=['GET'])
@require_permission('publish_app_publish_view')
def fetch_fields(app_id):
    pro = App.query.get_or_404(app_id)
    return json_response(pro.fields)


# 用于在发布详情页面获取启用的自定义菜单，需具有执行自定义菜单的权限
@blueprint.route('/<int:app_id>/menus', methods=['GET'])
@require_permission('publish_app_publish_menu_exec|publish_app_menu_view')
def fetch_menus(app_id):
    q_type = request.args.get('type')
    if q_type == 'built-in':
        menus = DeployMenu.query.filter_by(app_id=app_id).all()
        built_in_menus = get_built_in_menus()
        for item in menus:
            built_in_menus[item.name]['command'] = item.command
        return json_response(list(built_in_menus.values()))
    pro = App.query.get_or_404(app_id)
    if q_type == 'all':
        menus = pro.menus[:]
        menus.extend(DeployMenu.query.filter_by(app_id=app_id).all()[:])
    else:
        menus = pro.menus
    return json_response(menus)


# 用于编辑内置发布用菜单，需要具有发布菜单编辑权限
@blueprint.route('/<int:app_id>/bind/menus', methods=['POST'])
@require_permission('publish_app_menu_edit')
def bind_menus(app_id):
    all_valid_menus = get_built_in_menus()
    form, error = JsonParser(
        Argument('name', filter=lambda x: x in all_valid_menus, help='无效的菜单名称！', default=''),
        Argument('command', default='')
    ).parse()
    if error is None:
        if form.name is '':  # 可能通过发布页提供的添加预定义菜单的请求，格式[{name: 'x', desc: 'x', command: 'x'} ...]
            post_data = request.get_json()
            if isinstance(post_data, list) and all([isinstance(x, dict) and x['name'] in all_valid_menus for x in post_data]):
                for item in post_data:
                    tmp = all_valid_menus[item['name']]
                    tmp['command'] = item.get('command')
                    tmp['app_id'] = app_id
                    DeployMenu.upsert({'app_id': app_id, 'name': item['name']}, **tmp)
                return json_response()
            else:
                return json_response(message='错误的参数！')
        form.desc = get_built_in_menus()[form.name]['desc']
        form.app_id = app_id
        DeployMenu.upsert({'app_id': app_id, 'name': form.name}, **form)
    return json_response(message=error)
