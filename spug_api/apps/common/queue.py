from flask import Blueprint
from libs.tools import json_response, QueuePool
from queue import Empty

blueprint = Blueprint(__name__, __name__)


@blueprint.route('/state/<string:token>', methods=['GET'])
def state(token):
    q = QueuePool.get_queue(token)
    if q is None:
        return json_response(message='No such publish task')
    is_finished = q.finished
    try:
        message = q.get_nowait() if is_finished else q.get(timeout=10)
    except Empty:
        if is_finished:
            message = {'complete': True}
            QueuePool.remove_queue(token)
        else:
            message = {}
    return json_response(message)
