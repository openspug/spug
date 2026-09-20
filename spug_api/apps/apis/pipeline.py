# Copyright: (c) OpenSpug Organization. https://github.com/openspug/spug
# Copyright: (c) <spug.dev@gmail.com>
# Released under the AGPL-3.0 License.
from django.conf import settings
from django_redis import get_redis_connection
from apps.apis.utils import api_key_required, api_response, parse_json_body
from apps.pipeline.models import Pipeline, PipeHistory
from apps.pipeline.utils import NodeExecutor
from threading import Thread
from uuid import uuid4
import json

RESULT_TTL = 3600


def _marker_key(token):
    return f'{settings.PIPELINE_KEY}:api:{token}'


@api_key_required
def trigger(request, pipeline_id):
    if request.method != 'POST':
        return api_response(error='Method not allowed', status=405)
    body = parse_json_body(request)
    if body is None:
        return api_response(error='Invalid json body', status=400)
    pipe = Pipeline.objects.filter(pk=pipeline_id).first()
    if not pipe:
        return api_response(error='Pipeline not found', status=404)
    nodes = json.loads(pipe.nodes)
    if not nodes:
        return api_response(error='Pipeline has no nodes', status=400)

    params = body.get('params') or {}
    if not isinstance(params, dict):
        return api_response(error='params must be an object', status=400)
    for k, v in params.items():
        if isinstance(v, list):
            params[k] = ','.join(str(x) for x in v)

    required = []
    for item in nodes:
        module = item.get('module')
        if module == 'data_upload':
            return api_response(error='Pipeline with data upload node is not supported', status=400)
        elif module == 'parameter':
            for x in item.get('dynamic_params') or []:
                # 与页面的参数弹窗一致：未传的参数套用参数节点里配置的默认值
                if x['variable'] not in params and x.get('default') not in (None, ''):
                    params[x['variable']] = x['default']
                if x.get('required'):
                    required.append(x['variable'])
        elif module == 'build' and item.get('git_mode') == 'tag' and item.get('git_tag') == 'selective':
            required.append('_spug_git_tag')
    for key in required:
        if params.get(key) in (None, ''):
            return api_response(error=f'Missing required param: {key}', status=400)

    # 与页面执行保持一致：把参数节点的动态参数定义替换为本次传入的值
    for item in nodes:
        if item.get('module') == 'parameter':
            item['dynamic_params'] = params
            break

    latest_history = pipe.pipehistory_set.first()
    ordinal = latest_history.ordinal + 1 if latest_history else 1
    PipeHistory.objects.create(pipeline=pipe, ordinal=ordinal, created_by=pipe.created_by)

    token, rds = uuid4().hex, get_redis_connection()
    rds.set(_marker_key(token), pipe.id, RESULT_TTL)
    executor = NodeExecutor(rds, token, nodes, params, pipe_name=pipe.name)
    executor.helper.ttl = RESULT_TTL
    Thread(target=executor.run).start()
    return api_response({'token': token}, status=202)


@api_key_required
def result(request, token):
    rds = get_redis_connection()
    pipeline_id = rds.get(_marker_key(token))
    if not pipeline_id:
        return api_response(error='Token not found or expired', status=404)

    outputs, is_running = {}, rds.ttl(token) < 0
    for item in rds.lrange(token, 0, -1):
        item = json.loads(item.decode())
        node = outputs.setdefault(str(item['key']), {'status': '', 'output': ''})
        if item.get('data'):
            node['output'] += item['data']
        if item.get('status'):
            node['status'] = item['status']

    # 键不含 '.' 的是节点本身，'节点.主机' 形式的是节点下各主机的输出
    statuses = [v['status'] for k, v in outputs.items() if '.' not in k]
    if is_running or 'processing' in statuses:
        state = 'running'
    elif 'error' in statuses:
        state = 'failed'
    else:
        state = 'success'
    return api_response({'pipeline_id': int(pipeline_id), 'status': state, 'nodes': outputs})
