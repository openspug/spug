from flask import Blueprint
from public import db
from libs.tools import json_response, JsonParser, Argument
from apps.configuration.models import AppConfigRel
from collections import defaultdict
from libs.decorators import require_permission

blueprint = Blueprint(__name__, __name__)


@blueprint.route('/<int:app_id>/bind/relationship', methods=['POST'])
@require_permission('config_app_rel_edit')
def bind_relationship(app_id):
    form, error = JsonParser(Argument('app_ids', type=list), Argument('service_ids', type=list)).parse()
    if error is None:
        old_relationships = AppConfigRel.query.filter_by(s_id=app_id).all()[:]
        for key, value in [('app', x) for x in form.app_ids] + [('ser', x) for x in form.service_ids]:
            rel = AppConfigRel(s_id=app_id, d_id=value, d_type=key)
            if rel in old_relationships:
                old_relationships.remove(rel)
            else:
                rel.add()
        for old_rel in old_relationships:
            old_rel.delete(commit=False)
        db.session.commit()
    return json_response(message=error)


@blueprint.route('/<int:app_id>/bind/relationship', methods=['GET'])
@require_permission('config_app_rel_view')
def get_relationship(app_id):
    relationships = AppConfigRel.query.filter_by(s_id=app_id).all()
    result = defaultdict(list)
    for item in relationships:
        if item.d_type == 'app':
            result['app_ids'].append(item.d_id)
        elif item.d_type == 'ser':
            result['service_ids'].append(item.d_id)
    return json_response(result)