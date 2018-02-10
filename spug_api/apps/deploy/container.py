from flask import Blueprint
from libs.tools import json_response, Argument, AttrDict
from apps.deploy.models import AppHostRel, App
from apps.configuration.models import Environment

blueprint = Blueprint(__name__, __name__)

args = AttrDict(
    app_id=Argument('app_id', type=int),
    env_id=Argument('env_id', type=int),
    cli_id=Argument('cli_id', type=int)
)


@blueprint.route('/<int:host_id>/', methods=['GET'])
def get(host_id):
    relationships = [x.to_json() for x in AppHostRel.query.filter_by(host_id=host_id).all()]
    apps = App.query.filter(App.id.in_([x['app_id'] for x in relationships])).all() if relationships else []
    envs = Environment.query.filter(
        Environment.id.in_([x['env_id'] for x in relationships])).all() if relationships else []

    return json_response({
        'relationships': relationships,
        'apps': {x.id: x.to_json() for x in apps},
        'envs': {x.id: x.to_json() for x in envs}
    })
