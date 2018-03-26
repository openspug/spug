from flask import Blueprint
from apps.deploy.models import App
from apps.configuration.models import Service
from libs.tools import json_response
from apps.configuration.models import AppConfigRel
from libs.decorators import require_permission

blueprint = Blueprint(__name__, __name__)


@blueprint.route('/', methods=['GET'])
@require_permission('config_app_rel_view')
def get():
    apps = App.query.all()
    services = Service.query.all()
    relations = AppConfigRel.query.all()
    return json_response({
        'apps': [x.to_json() for x in apps],
        'services': [x.to_json() for x in services],
        'relations': [x.to_json() for x in relations]
    })
