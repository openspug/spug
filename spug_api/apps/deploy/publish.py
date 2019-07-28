from public import app
from flask import Blueprint, g
from apps.deploy.models import App, History
from apps.assets.models import Host
from apps.configuration.models import Environment
from libs.tools import human_time, json_response, JsonParser, Argument
from libs.decorators import with_app_context
from libs.decorators import require_permission
from libs.tools import QueuePool
from apps.deploy.utils import *
from threading import Thread
from io import BytesIO
from functools import partial
import tarfile
import uuid
import time
import os
from apps.system.models import NotifyWay
from libs.utils import send_ding_ding


blueprint = Blueprint(__name__, __name__)


@blueprint.route('/history/<int:app_id>', methods=['GET'])
@require_permission('publish_app_publish_deploy')
def history(app_id):
    histories = History.query.filter(
        History.app_id == app_id,
        History.deploy_message != '').order_by(History.created.desc()).limit(20).all()
    return json_response(histories)


@blueprint.route('/update', methods=['POST'])
@require_permission('publish_app_publish_deploy')
def app_update():
    form, error = JsonParser(
        Argument('app_id', type=int),
        Argument('env_id', type=int),
        Argument('deploy_message', default=''),
        Argument('deploy_restart', type=bool),
        Argument('host_ids', type=list)
    ).parse()
    if error is None:
        if not g.user.check_deploy_permission(form.env_id, form.app_id):
            return json_response(message='Permission denied'), 403
        token = uuid.uuid4().hex
        q = QueuePool.make_queue(token, len(form.host_ids))
        for host_id in form.pop('host_ids'):
            Thread(target=do_update, args=(q, form, host_id)).start()
        return json_response(token)
    return json_response(message=error)


@with_app_context
def do_update(q, form, host_id):
    ctr, api_token, deploy_success = None, None, False
    history = History(host_id=host_id, created=human_time(), deploy_success=deploy_success, **form).save()
    send_message = partial(PublishMessage.make_message, q, host_id)
    try:
        send_message('正在检测环境 . . . ')
        pro = App.query.get_or_404(form.app_id)
        env = Environment.query.get_or_404(form.env_id)
        cli = Host.query.get_or_404(host_id)
        hooks = {x.name: x.command for x in DeployMenu.query.filter_by(app_id=form.app_id)}
        ctr = Container(cli.docker_uri, pro.identify + '.' + env.identify)
        image = app.config['DOCKER_REGISTRY_SERVER'] + '/' + pro.image.name
        image_tag = pro.image.latest
        ctr_info = ctr.info
        if ctr.api_version < '1.21':
            send_message('环境检测失败，docker版本过低，请升级至1.9.x以上！', level='error')
            return
        else:
            send_message('环境检测完成！', update=True)
        # 当容器不存在或镜像有更新时，需要获取新镜像并使用新镜像重新创建容器
        if ctr_info is None or ctr_info.Image != image + ':' + image_tag:
            send_message('正在更新镜像，版本{0} . . . '.format(image_tag))
            ctr.pull_image(image, image_tag)
            send_message('镜像更新完成！', update=True)
            if ctr_info:
                send_message('正在删除原有容器 . . .')
                ctr.remove()
                send_message('删除原有容器成功！', update=True)
            send_message('正在创建新容器 . . . ')
            api_token = create_container(ctr, pro, env, image='{0}:{1}'.format(image, image_tag))
            history.update(api_token=api_token)
            send_message('创建新容器成功！', update=True)
            # 复制文件
            send_message('正在初始化容器 . . . ')
            tar_buffer = BytesIO()
            with tarfile.open(fileobj=tar_buffer, mode='w') as tar:
                add_file_to_tar(tar, os.path.join(app.config['BASE_DIR'], 'libs', 'scripts', 'entrypoint.sh'))
                # add_file_to_tar(tar, os.path.join(app.config['BASE_DIR'], 'libs', 'scripts', 'proxy_execute.sh'))
            ctr.put_archive('/', tar_buffer.getvalue())
            send_message('初始化容器成功！', update=True)
            # 启动容器
            send_message('正在启动新容器 . . . ')
            ctr.start()
            send_message('启动新容器成功！', update=True)
            # 执行init钩子
            send_message('正在执行应用初始化 . . .')
            exec_code, exec_output = ctr.exec_command_with_base64(hooks['容器创建'], timeout=120, with_exit_code=True)
            if exec_code != 0:
                send_message('执行应用初始化失败，退出状态码：{0}'.format(exec_code), level='error')
                send_message(exec_output, level='console')
                return
            else:
                send_message('执行应用初始化成功！', update=True)
            # 清理无用镜像
            if ctr.client.api_version >= "1.25":
                ctr.prune_images()
        # 当前容器如果为退出状态，则启动容器
        elif not ctr_info.running:
            send_message('容器当前为停止状态，正在启动容器 . . . ')
            ctr.start()
            send_message('启动容器成功！', update=True)
        # 执行发布操作
        send_message('正在执行应用更新 . . . ')
        send_publish_message(pro.notify_way_id, pro.name + ' 开始更新 . . .')
        exec_code, exec_output = ctr.exec_command_with_base64(hooks['应用发布'], form.deploy_message, timeout=120,
                                                              with_exit_code=True)
        if exec_code != 0:
            send_message('执行应用更新失败，退出状态码：{0}'.format(exec_code), level='error')
            send_publish_message(pro.notify_way_id, pro.name + ' 发布失败！', status='failed')
            send_message(exec_output, level='console')
            return
        else:
            send_message('执行应用更新成功！', update=True)
        # 根据选择执行重启容器操作
        if form.deploy_restart:
            send_message('正在重启容器 . . . ')
            ctr.restart(timeout=3)
            send_message('重启容器成功！', update=True)
        # 整个流程正常结束
        send_publish_message(pro.notify_way_id, pro.name + ' 发布成功', status='success')
        send_message('完成发布！', level='success')
        deploy_success = True
    except Exception as e:
        send_message('%s' % e, level='error')
        raise e
    finally:
        q.done()
        if deploy_success:
            history.update(deploy_success=True)


class PublishMessage(object):
    start_time = time.time()

    @classmethod
    def make_message(cls, q, host_id, message, level='info', update=False):
        data = {
            'hid': host_id,
            'msg': message,
            'level': level,
            'update': update
        }
        if update:
            duration = time.time() - cls.start_time
            cls.start_time = time.time()
            data['duration'] = duration
        q.put(data)


def send_publish_message(notify_way_id, message, status='info'):
    if notify_way_id:
        notice_value = NotifyWay.query.filter_by(id=notify_way_id).first()
        if status == 'success':
            publish_status = '<font color=\"#85CE60\">发布成功</font>'
        elif status == 'failed':
            publish_status = '<font color=\"#f90202\">发布失败</font>'
        else:
            publish_status = '<font color=\"#A6A9AD\">开始发布</font>'

        msg = f'# <font face=\"微软雅黑\">运维平台通知</font> #  \n <br>  \n  ' \
            f'**发布信息:**  {message} \n  \n  ' \
            f'**平台地址:**  http://spug.qbangmang.com \n  \n ' \
            f'**发布状态:**  {publish_status}<br /> \n \n ' \

        send_ding_ding(token_url=notice_value.value, contacts=[], msg=msg)
