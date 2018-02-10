from flask import Blueprint
from apps.assets.models import Host
from apps.deploy.models import App, DeployMenu
from apps.configuration.models import Environment
from libs.tools import json_response, JsonParser, Argument, QueuePool
from libs.decorators import require_permission
from libs.utils import Container
from threading import Thread
import uuid

blueprint = Blueprint(__name__, __name__)


@blueprint.route('/', methods=['POST'])
@require_permission('publish_app_publish_deploy|publish_app_publish_menu_exec')
def post():
    form, error = JsonParser(
        Argument('app_id', type=int),
        Argument('env_id', type=int),
        Argument('menu_id', type=int),
        Argument('message', default=''),
        Argument('host_ids', type=list)
    ).parse()
    if error is None:
        pro = App.query.get_or_404(form.app_id)
        env = Environment.query.get_or_404(form.env_id)
        menu = DeployMenu.query.get_or_404(form.menu_id)
        ctr_name = '%s.%s' % (pro.identify, env.identify)
        if menu.position == 2:
            cli = Host.query.get_or_404(form.host_ids[0])
            ctr = Container(cli.docker_uri, ctr_name)
            if menu.display_type == 2:
                exec_code, _ = ctr.exec_command_with_base64(menu.command, form.message, with_exit_code=True)
                return json_response(exec_code)
            elif menu.display_type == 1:
                token = uuid.uuid4().hex
                queue = QueuePool.make_queue(token, 1)
                queue.containers = [ctr]
                Thread(target=do_exec_with_stream,
                       args=(token, ctr, menu.command, form.message, 10 * 60)).start()
                return json_response(token)
        # 发布区自定义菜单只允许通知成功与否，固无需判断display_type
        elif menu.position == 1:
            token = uuid.uuid4().hex
            hosts = Host.query.filter(Host.id.in_(form.host_ids)).all()
            queue = QueuePool.make_queue(token, len(hosts))
            for cli in hosts:
                ctr = Container(cli.docker_uri, ctr_name)
                Thread(target=do_exec, args=(queue, ctr, cli.name, menu.command, form.message)).start()
            return json_response({'token': token, 'data': [{'name': x.name} for x in hosts]})


@blueprint.route('/<string:token>', methods=['DELETE'])
@require_permission('publish_app_publish_deploy|publish_app_publish_menu_exec')
def delete(token):
    queue = QueuePool.get_queue(token)
    if queue:
        for ctr in queue.containers:
            ctr.exec_command('/entrypoint.sh kill ' + token)
        queue.done()
    return json_response()


def do_exec(queue, ctr, host_name, command, message, timeout=30):
    try:
        exec_code, _ = ctr.exec_command_with_base64(command, message, timeout=timeout, with_exit_code=True)
        queue.put({host_name: exec_code})
    except Exception as e:
        queue.put({host_name: '%s' % e})
    finally:
        queue.done()


def do_exec_with_stream(token, ctr, command, message, timeout=30):
    queue = QueuePool.get_queue(token)
    try:
        for item in ctr.exec_command_with_base64(command, message, timeout=timeout, token=token, stream=True):
            queue.put({'message': item.decode()})
    except Exception as e:
        queue.put({'message': '%s' % e})
    finally:
        queue.done()
