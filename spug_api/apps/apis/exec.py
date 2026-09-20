# Copyright: (c) OpenSpug Organization. https://github.com/openspug/spug
# Copyright: (c) <spug.dev@gmail.com>
# Released under the AGPL-3.0 License.
from django.conf import settings
from django_redis import get_redis_connection
from apps.apis.utils import api_key_required, api_response, parse_json_body
from apps.exec.models import ExecTemplate
from apps.host.models import Host
import json
import uuid

RESULT_TTL = 3600


def _result_key(token):
    return f'{settings.EXEC_RESULT_KEY}:{token}'


@api_key_required
def trigger(request, template_id):
    if request.method != 'POST':
        return api_response(error='Method not allowed', status=405)
    body = parse_json_body(request)
    if body is None:
        return api_response(error='Invalid json body', status=400)
    template = ExecTemplate.objects.filter(pk=template_id).first()
    if not template:
        return api_response(error='Template not found', status=404)

    host_ids = body.get('host_ids') or json.loads(template.host_ids)
    if not isinstance(host_ids, list) or not host_ids:
        return api_response(error='host_ids is required, the template has no default hosts', status=400)
    hosts = list(Host.objects.filter(id__in=host_ids))
    missing = set(host_ids) - {x.id for x in hosts}
    if missing:
        return api_response(error=f'Host not found: {sorted(missing)}', status=400)

    params = body.get('params') or {}
    if not isinstance(params, dict):
        return api_response(error='params must be an object', status=400)
    for item in json.loads(template.parameters):
        if item['variable'] not in params and item.get('default') not in (None, ''):
            params[item['variable']] = item['default']
        if item.get('required') and params.get(item['variable']) in (None, ''):
            return api_response(error=f'Missing required param: {item["variable"]}', status=400)

    token, rds = uuid.uuid4().hex, get_redis_connection()
    meta = {'template_id': template.id, 'hosts': {x.id: f'{x.name}({x.hostname}:{x.port})' for x in hosts}}
    rds.hset(_result_key(token), 'meta', json.dumps(meta))
    rds.expire(_result_key(token), RESULT_TTL)
    for host in hosts:
        data = dict(
            key=host.id,
            name=host.name,
            token=token,
            interpreter=template.interpreter,
            hostname=host.hostname,
            port=host.port,
            username=host.username,
            command=template.body,
            pkey=host.private_key,
            params=params,
            record=True,
        )
        rds.rpush(settings.EXEC_WORKER_KEY, json.dumps(data))
    return api_response({'token': token}, status=202)


@api_key_required
def result(request, token):
    rds = get_redis_connection()
    raw = rds.hgetall(_result_key(token))
    if not raw:
        return api_response(error='Token not found or expired', status=404)
    raw = {k.decode(): v.decode() for k, v in raw.items()}
    hosts, state = [], 'success'
    for host_id, title in json.loads(raw['meta'])['hosts'].items():
        code = raw.get(f'status:{host_id}')
        output = rds.get(f'{_result_key(token)}:{host_id}')
        if code is None:
            status = state = 'running'
        elif code == '0':
            status = 'success'
        else:
            status = 'failed'
            if state != 'running':
                state = 'failed'
        hosts.append(dict(
            id=int(host_id),
            title=title,
            status=status,
            exit_code=None if code is None else int(code),
            output=output.decode(errors='replace') if output else ''
        ))
    return api_response({'status': state, 'hosts': hosts})
