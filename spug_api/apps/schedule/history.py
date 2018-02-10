from flask import Blueprint
from libs.tools import json_response
from apps.schedule.models import JobHistory
import html
from libs.decorators import require_permission

blueprint = Blueprint(__name__, __name__)


@blueprint.route('/<int:job_id>', methods=['GET'])
@require_permission('job_task_log | job_task_view')
def get(job_id):
    result = []
    tmp = JobHistory.query.filter_by(job_id=job_id).order_by(JobHistory.created.desc()).limit(20).all()
    for item in [x.to_json() for x in tmp]:
        item['stdout'] = html.escape(item['stdout']).replace('\n', '<br/>') if item['stdout'] else '无内容'
        item['stderr'] = html.escape(item['stderr']).replace('\n', '<br/>') if item['stderr'] else '无内容'
        result.append(item)
    return json_response(result)

