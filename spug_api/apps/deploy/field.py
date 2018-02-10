from flask import Blueprint
from public import db
from libs.tools import json_response, JsonParser, Argument, AttrDict
from docker.errors import DockerException
from libs.utils import Container
from apps.deploy.models import DeployField, App, AppFieldRel
from apps.configuration.models import Environment
from apps.assets.models import Host
from libs.decorators import require_permission

blueprint = Blueprint(__name__, __name__)

args = AttrDict(
    name=Argument('name', help='请输入字段名称'),
    desc=Argument('desc', help='请输入字段描述'),
    command=Argument('command', help='请输入执行的内容'),
)


@blueprint.route('/', methods=['GET'])
@require_permission('publish_field_view')
def get():
    fields = DeployField.query.all()
    return json_response(fields)


@blueprint.route('/', methods=['POST'])
@require_permission('publish_field_add')
def post():
    form, error = JsonParser(*args.values()).parse()
    if error is None:
        DeployField(**form).save()
    return json_response(message=error)


@blueprint.route('/<int:field_id>', methods=['PUT'])
@require_permission('publish_field_edit')
def put(field_id):
    form, error = JsonParser(*args.values()).parse()
    if error is None:
        field = DeployField.query.get_or_404(field_id)
        field.update(**form)
    return json_response(message=error)


@blueprint.route('/<int:field_id>', methods=['DELETE'])
@require_permission('publish_field_del')
def delete(field_id):
    field = DeployField.query.get_or_404(field_id)
    rel = AppFieldRel.query.filter_by(field_id=field_id).first()
    if rel:
        rel_app = App.query.get_or_404(rel.app_id)
        return json_response(message='应用 <%s> 使用了该字段，请解除关联后再尝试删除该字段！' % rel_app.name)
    field.delete()
    return json_response()


@blueprint.route('/<int:field_id>/exec', methods=['POST'])
@require_permission('publish_app_view')
def do_exec(field_id):
    form, error = JsonParser(
        Argument('host_id', type=int),
        Argument('app_id', type=int),
        Argument('env_id', type=int)
    ).parse()
    if error is None:
        field = DeployField.query.get_or_404(field_id)
        pro = App.query.get_or_404(form.app_id)
        cli = Host.query.get_or_404(form.host_id)
        env = Environment.query.get_or_404(form.env_id)
        try:
            ctr = Container(cli.docker_uri, '{}.{}'.format(pro.identify, env.identify))
            output = ctr.exec_command_with_base64(field.command, timeout=5)
        except DockerException:
            output = 'N/A'
        return json_response(output.strip())
    return json_response(message=error)


@blueprint.route('/<int:field_id>/apps', methods=['GET'])
@require_permission('publish_field_rel_view')
def fetch_apps(field_id):
    field = DeployField.query.get_or_404(field_id)
    return json_response(field.apps)


@blueprint.route('/<int:field_id>/bind/apps', methods=['POST'])
@require_permission('publish_field_rel_edit')
def bind_apps(field_id):
    form, error = JsonParser(Argument('app_ids', type=list)).parse()
    if error is None:
        old_relationships = AppFieldRel.query.filter_by(field_id=field_id).all()[:]
        for app_id in form.app_ids:
            rel = AppFieldRel(field_id=field_id, app_id=app_id)
            if rel in old_relationships:
                old_relationships.remove(rel)
            else:
                rel.add()
        for old_rel in old_relationships:
            old_rel.delete(commit=False)
        db.session.commit()
    return json_response(message=error)