from flask import Blueprint, request
from apps.assets.models import HostExecTemplate, Host
from libs.tools import json_response, JsonParser, Argument, QueuePool
from libs.ssh import ssh_exec_command_with_stream, get_ssh_client
from public import db
from libs.decorators import require_permission
from threading import Thread
import json
import uuid

blueprint = Blueprint(__name__, __name__)


@blueprint.route('/tpl/', methods=['GET'])
@require_permission('assets_host_exec_view | assets_host_exec | assets_host_exec_tpl_view')
def get():
    form, error = JsonParser(Argument('page', type=int, default=1, required=False),
                             Argument('pagesize', type=int, default=10, required=False),
                             Argument('tpl_query', type=dict, required=False),).parse(request.args)
    if error is None:
        tpl_data = HostExecTemplate.query
        if form.page == -1:
            return json_response({'data': [x.to_json() for x in tpl_data.all()], 'total': -1})

        if form.tpl_query['name_field']:
            tpl_data = tpl_data.filter(HostExecTemplate.tpl_name.like('%{}%'.format(form.tpl_query['name_field'])))

        if form.tpl_query['type_field']:
            tpl_data = tpl_data.filter_by(tpl_type=form.tpl_query['type_field'])

        result = tpl_data.limit(form.pagesize).offset((form.page - 1) * form.pagesize).all()
        return json_response({'data': [x.to_json() for x in result], 'total': tpl_data.count()})
    return json_response(message=error)


@blueprint.route('/tpl/', methods=['POST'])
@require_permission('assets_host_exec_tpl_add')
def post():
    form, error = JsonParser('tpl_name', 'tpl_type', 'tpl_content',
                             Argument('tpl_desc', nullable=True, required=False)).parse()
    if error is None:
        tpl = HostExecTemplate(**form)
        tpl.save()
        return json_response(tpl)
    return json_response(message=error)


@blueprint.route('/tpl/<int:tpl_id>', methods=['DELETE'])
@require_permission('assets_host_exec_tpl_del')
def delete(tpl_id):
    HostExecTemplate.query.get_or_404(tpl_id).delete()
    return json_response()


@blueprint.route('/tpl/<int:tpl_id>', methods=['PUT'])
@require_permission('assets_host_exec_tpl_edit')
def put(tpl_id):
    form, error = JsonParser('tpl_name', 'tpl_type', 'tpl_content',
                             Argument('tpl_desc', nullable=True, required=False)).parse()
    if error is None:
        tpl = HostExecTemplate.query.get_or_404(tpl_id)
        tpl.update(**form)
        return json_response(tpl)
    return json_response(message=error)


@blueprint.route('/tpl_type', methods=['GET'])
@require_permission('assets_host_exec_view | assets_host_exec_tpl_view')
def fetch_tpl_type():
    types = db.session.query(HostExecTemplate.tpl_type.distinct().label('tpl_type')).all()
    return json_response([x.tpl_type for x in types])


@blueprint.route('/exec_command/<string:token>', methods=['DELETE'])
@require_permission('assets_host_exec')
def exec_delete(token):
    q = QueuePool.get_queue(token)
    if q:
        q.destroy()
    return json_response()


@blueprint.route('/exec_command', methods=['POST'])
@require_permission('assets_host_exec')
def exec_host_command():
    form, error = JsonParser('hosts_id', 'command').parse()
    if error is None:
        ip_list = Host.query.filter(Host.id.in_(tuple(form.hosts_id))).all()
        token = uuid.uuid4().hex
        q = QueuePool.make_queue(token, len(ip_list))
        for h in ip_list:
            Thread(target=hosts_exec, args=(q, h.ssh_ip, h.ssh_port, form.command)).start()
        return json_response(token)
    return json_response(message=error)


def hosts_exec(q, ip, port, command):
    key = '%s:%s' % (ip, port)
    try:
        ssh_client = get_ssh_client(ip, port)
        q.destroyed.append(ssh_client.close)
        output = ssh_exec_command_with_stream(ssh_client, command)
        for line in output:
            q.put({key: line})
        q.put({key: '\n** 执行完成 **'})
        q.done()
    except Exception as e:
        q.put({key: '%s\n' % e})
        q.put({key: '\n** 执行异常结束 **'})
        q.done()
