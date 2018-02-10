from flask import Blueprint
from libs.tools import json_response, JsonParser, Argument, AttrDict
from libs.utils import Container
from apps.deploy.models import AppHostRel, App
from apps.assets.models import Host
from apps.configuration.models import Environment
import time
from libs.decorators import require_permission


blueprint = Blueprint(__name__, __name__)

args = AttrDict(
    app_id=Argument('app_id', type=int),
    env_id=Argument('env_id', type=int),
    cli_id=Argument('cli_id', type=int)
)


@blueprint.route('/<int:app_id>/<string:env_id>', methods=['GET'])
@require_permission('publish_app_publish_view | publish_app_publish_deploy')
def get(app_id, env_id):
    hosts = Host.query.join(AppHostRel).filter_by(env_id=env_id, app_id=app_id).all()
    return json_response(hosts)


@blueprint.route('/', methods=['POST'])
@require_permission('publish_app_publish_view | publish_app_publish_deploy')
def post():
    form, error = JsonParser(
        Argument('action', filter=lambda x: x in ['v_start', 'v_stop', 'v_remove'], help='无效的操作指令！'),
        *args.values()
    ).parse()
    if error is None:
        pro = App.query.get_or_404(form.app_id)
        env = Environment.query.get_or_404(form.env_id)
        cli = Host.query.get_or_404(form.cli_id)
        ctr = Container(cli.docker_uri, pro.identify + '.' + env.identify)
        # ctr_info = ctr.info
        # if form.action != 'v_start':
        #     if ctr_info.State != 'running':
        #         ctr.start()
        #     exec_code, exec_out = ctr.exec_command('/entrypoint.sh ' + form.action, True)
        #     if exec_code != '0':
        #         print('执行{0}钩子失败，返回状态码：{1}'.format(form.action, exec_code))
        #         # return json_response(message='执行{0}钩子失败，返回状态码：{1}'.format(form.action, exec_code))
        getattr(ctr, form.action.lstrip('v_'))()
    return json_response(message=error)


@blueprint.route('/state', methods=['POST'])
@require_permission('publish_app_publish_view | publish_app_publish_deploy')
def state():
    form, error = JsonParser(*args.values()).parse()
    if error:
        return json_response(message=error)
    pro = App.query.get_or_404(form.app_id)
    env = Environment.query.get_or_404(form.env_id)
    cli = Host.query.get_or_404(form.cli_id)
    ctr_name = pro.identify + '.' + env.identify
    info = Container(cli.docker_uri, ctr_name).info
    if info:
        return json_response({'running': info.running, 'status': info.Status, 'image': info.Image})
    else:
        return json_response({'running': False, 'status': 'N/A', 'image': 'N/A'})


@blueprint.route('/logs', methods=['POST'])
@require_permission('publish_app_publish_view | publish_app_publish_deploy')
def logs():
    form, error = JsonParser(*args.values()).parse()
    if error is None:
        pro = App.query.get_or_404(form.app_id)
        env = Environment.query.get_or_404(form.env_id)
        cli = Host.query.get_or_404(form.cli_id)
        ctr = Container(cli.docker_uri, pro.identify + '.' + env.identify)
        str_logs = ctr.logs(timestamps=True, tail=20, since=int(time.time() - 300))
        return json_response(str_logs)
    return json_response(message=error)
