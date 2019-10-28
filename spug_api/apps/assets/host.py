from flask import Blueprint, request
from apps.assets.models import Host, HostExtend
from apps.deploy.models import AppHostRel
from libs.tools import json_response, JsonParser, Argument
from apps.setting import utils, Setting
from libs import ssh
from libs.utils import DockerClient, DockerException
import math
from public import db
from libs.decorators import require_permission
from apps.assets.utils import excel_parse

blueprint = Blueprint(__name__, __name__)


@blueprint.route('/', methods=['GET'])
@require_permission('assets_host_view | publish_app_publish_host_select | '
                    'job_task_add | job_task_edit | assets_host_exec')
def get():
    form, error = JsonParser(Argument('page', type=int, default=1, required=False),
                             Argument('pagesize', type=int, default=10, required=False),
                             Argument('host_query', type=dict, default={}), ).parse(request.args)
    if error is None:
        host_data = Host.query
        if form.page == -1:
            return json_response({'data': [x.to_json() for x in host_data.all()], 'total': -1})
        if form.host_query.get('name_field'):
            host_data = host_data.filter(Host.name.like('%{}%'.format(form.host_query['name_field'])))
        if form.host_query.get('zone_field'):
            host_data = host_data.filter_by(zone=form.host_query['zone_field'])

        result = host_data.limit(form.pagesize).offset((form.page - 1) * form.pagesize).all()
        return json_response({'data': [x.to_json() for x in result], 'total': host_data.count()})
    return json_response(message=error)


@blueprint.route('/', methods=['POST'])
@require_permission('assets_host_add')
def post():
    form, error = JsonParser('name', 'type', 'zone', 'ssh_ip', 'ssh_port',
                             Argument('docker_uri', nullable=True, required=False),
                             Argument('desc', nullable=True, required=False)).parse()
    if error is None:
        host = Host(**form)
        host.save()
        return json_response(host)
    return json_response(message=error)


@blueprint.route('/<int:host_id>', methods=['DELETE'])
@require_permission('assets_host_del')
def delete(host_id):
    host = Host.query.get_or_404(host_id)
    if AppHostRel.query.filter_by(host_id=host_id).first():
        return json_response(message='请先取消与应用的关联后，再尝试删除该主机。')
    host.delete()
    return json_response()


@blueprint.route('/<int:host_id>', methods=['PUT'])
@require_permission('assets_host_edit')
def put(host_id):
    form, error = JsonParser('name', 'type', 'zone', 'ssh_ip', 'ssh_port',
                             Argument('docker_uri', nullable=True, required=False),
                             Argument('desc', nullable=True, required=False)).parse()
    if error is None:
        host = Host.query.get_or_404(host_id)
        host.update(**form)
        return json_response(host)
    return json_response(message=error)


@blueprint.route('/<int:host_id>/valid', methods=['GET'])
@require_permission('assets_host_valid')
def get_valid(host_id):
    cli = Host.query.get_or_404(host_id)
    if not Setting.has('ssh_private_key'):
        utils.generate_and_save_ssh_key()
    if ssh.ssh_ping(cli.ssh_ip, cli.ssh_port):
        if cli.docker_uri:
            try:
                sync_host_info(host_id, cli.docker_uri)
            except DockerException:
                return json_response(message='docker fail')
    else:
        return json_response(message='ssh fail')
    return json_response()


@blueprint.route('/<int:host_id>/valid', methods=['POST'])
@require_permission('assets_host_valid')
def post_valid(host_id):
    form, error = JsonParser(Argument('secret', help='请输入root用户的密码！')).parse()
    if error is None:
        cli = Host.query.get_or_404(host_id)
        ssh.add_public_key(cli.ssh_ip, cli.ssh_port, form.secret)
        if ssh.ssh_ping(cli.ssh_ip, cli.ssh_port):
            if cli.docker_uri:
                try:
                    sync_host_info(host_id, cli.docker_uri)
                except DockerException:
                    return json_response(message='获取扩展信息失败，请检查docker是否可以正常连接！')
        else:
            return json_response(message='验证失败！')
    return json_response(message=error)


@blueprint.route('/<int:host_id>/extend/', methods=['GET'])
@require_permission('assets_host_valid')
def get_extend(host_id):
    host_extend = HostExtend.query.filter_by(host_id=host_id).first()
    return json_response(host_extend)


@blueprint.route('/zone/', methods=['GET'])
@require_permission('assets_host_valid | assets_host_exec')
def fetch_groups():
    zones = db.session.query(Host.zone.distinct().label('zone')).all()
    return json_response([x.zone for x in zones])


@blueprint.route('/import', methods=['POST'])
@require_permission('assets_host_add')
def host_import():
    data = excel_parse()
    if data:
        index_map = {key: index for index, key in enumerate(data.keys())}
        for row in zip(*data.values()):
            print(row)
            Host(
                name=row[index_map['主机名称']],
                desc=row[index_map['备注信息']],
                type=row[index_map['主机类型']],
                zone=row[index_map['所属区域']],
                docker_uri=row[index_map['Docker连接地址']],
                ssh_ip=row[index_map['SSH连接地址']],
                ssh_port=row[index_map['SSH端口']],
            ).add()
        db.session.commit()
        return json_response(data='导入成功')


def sync_host_info(host_id, uri):
    host_info = DockerClient(base_url=uri).docker_info()
    operate_system = host_info.get('OperatingSystem')
    memory = math.ceil(int(host_info.get('MemTotal')) / 1024 / 1024 / 1024)
    cpu = host_info.get('NCPU')
    # outer_ip = 1
    # inner_ip = 2
    HostExtend.upsert({'host_id': host_id}, host_id=host_id, operate_system=operate_system, memory=memory, cpu=cpu)
    return True
