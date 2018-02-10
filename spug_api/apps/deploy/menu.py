from flask import Blueprint
from public import db
from libs.tools import json_response, JsonParser, Argument, AttrDict
from apps.deploy.models import App, DeployMenu, AppMenuRel
from libs.decorators import require_permission

blueprint = Blueprint(__name__, __name__)

args = AttrDict(
    name=Argument('name', help='请输入菜单名称'),
    desc=Argument('desc', help='请输入菜单描述'),
    posistion=Argument('position', type=int, filter=lambda x: x in (1, 2), help='请输入合法的展示位置'),
    display_type=Argument('display_type', type=int, filter=lambda x: x in (1, 2), help='请输入合法的展示方式'),
    command=Argument('command', help='请输入执行的内容'),
    required_args=Argument('required_args', type=bool),
    required_confirm=Argument('required_confirm', type=bool)
)


@blueprint.route('/', methods=['GET'])
@require_permission('publish_menu_view')
def get():
    menus = DeployMenu.query.filter(DeployMenu.app_id.is_(None)).all()
    return json_response(menus)


@blueprint.route('/', methods=['POST'])
@require_permission('publish_menu_add')
def post():
    form, error = JsonParser(*args.values()).parse()
    if error is None:
        DeployMenu(**form).save()
    return json_response(message=error)


@blueprint.route('/<int:menu_id>', methods=['PUT'])
@require_permission('publish_menu_edit')
def put(menu_id):
    form, error = JsonParser(*args.values()).parse()
    if error is None:
        menu = DeployMenu.query.get_or_404(menu_id)
        menu.update(**form)
    return json_response(message=error)


@blueprint.route('/<int:menu_id>', methods=['DELETE'])
@require_permission('publish_menu_del')
def delete(menu_id):
    menu = DeployMenu.query.get_or_404(menu_id)
    rel = AppMenuRel.query.filter_by(menu_id=menu_id).first()
    if rel:
        rel_app = App.query.get_or_404(rel.app_id)
        return json_response(message='应用 <%s> 使用了该菜单，请解除关联后再尝试删除该菜单！' % rel_app.name)
    menu.delete()
    return json_response()


@blueprint.route('/<int:menu_id>/apps', methods=['GET'])
@require_permission('publish_menu_rel_view')
def fetch_apps(menu_id):
    field = DeployMenu.query.get_or_404(menu_id)
    return json_response(field.apps)


@blueprint.route('/<int:menu_id>/bind/apps', methods=['POST'])
@require_permission('publish_menu_rel_edit')
def bind_apps(menu_id):
    form, error = JsonParser(Argument('app_ids', type=list)).parse()
    if error is None:
        old_relationships = AppMenuRel.query.filter_by(menu_id=menu_id).all()[:]
        for app_id in form.app_ids:
            rel = AppMenuRel(menu_id=menu_id, app_id=app_id)
            if rel in old_relationships:
                old_relationships.remove(rel)
            else:
                rel.add()
        for old_rel in old_relationships:
            old_rel.delete(commit=False)
        db.session.commit()
    return json_response(message=error)
