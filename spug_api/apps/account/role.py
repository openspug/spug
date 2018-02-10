from flask import Blueprint
from public import db
from apps.account.models import Role, User, RolePermissionRel, Permission
from libs.tools import json_response, JsonParser, Argument
from libs.decorators import require_permission

blueprint = Blueprint(__name__, __name__)


@blueprint.route('/', methods=['GET'])
@require_permission('account_role_view|account_user_view')
def get():
    roles = Role.query.all()
    return json_response(roles)


@blueprint.route('/', methods=['POST'])
@require_permission('account_role_add')
def post():
    form, error = JsonParser('name', 'desc').parse()
    if error is None:
        Role(**form).save()
    return json_response(message=error)


@blueprint.route('/<int:role_id>', methods=['PUT'])
@require_permission('account_role_edit')
def put(role_id):
    form, error = JsonParser('name', 'desc').parse()
    if error is None:
        role = Role.query.get_or_404(role_id)
        role.update(**form)
    return json_response(message=error)


@blueprint.route('/<int:role_id>', methods=['DELETE'])
@require_permission('account_role_del')
def delete(role_id):
    user = User.query.filter_by(role_id=role_id).first()
    if user:
        return json_response(message='用户 <%s（%s）> 正在使用该角色，请更换该用户的角色后再尝试删除！' % (user.username, user.nickname))
    Role.query.get_or_404(role_id).delete()
    return json_response()


@blueprint.route('/<int:role_id>/permissions', methods=['GET'])
@require_permission('account_role_permission_view')
def get_permission(role_id):
    result = {}
    has_permissions = Role.get_permissions(role_id)
    for item in Permission.query.all():
        item = item.to_json()
        item.update(is_has=item['name'] in has_permissions)
        result[item.pop('name')] = item
    return json_response(result)


@blueprint.route('/<int:role_id>/permissions', methods=['POST'])
@require_permission('account_role_permission_edit')
def edit_permission(role_id):
    form, error = JsonParser(Argument('codes', type=list)).parse()
    if error is None:
        old_relationships = RolePermissionRel.query.filter_by(role_id=role_id).all()[:]
        for item in form.codes:
            rel = RolePermissionRel(role_id=role_id, permission_id=item)
            if rel in old_relationships:
                old_relationships.remove(rel)
            else:
                rel.add()
        for old_rel in old_relationships:
            old_rel.delete(commit=False)
        db.session.commit()
    return json_response(message=error)


@blueprint.route('/<int:role_id>/permissions/publish', methods=['POST'])
@require_permission('account_role_permission_edit')
def publish_permission(role_id):
    form, error = JsonParser(Argument('app_ids', type=list), Argument('env_ids', type=list)).parse()
    if error is None:
        str_app_ids = [str(x) for x in form.app_ids]
        str_env_ids = [str(x) for x in form.env_ids]
        role = Role.query.get_or_404(role_id)
        role.update(app_ids=','.join(str_app_ids), env_ids=','.join(str_env_ids))
    return json_response(message=error)