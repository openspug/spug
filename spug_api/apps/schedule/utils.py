# Copyright: (c) OpenSpug Organization. https://github.com/openspug/spug
# Copyright: (c) <spug.dev@gmail.com>
# Released under the AGPL-3.0 License.
from libs.utils import human_datetime
from libs.spug import Notification
from libs.mail import Mail
from apps.setting.utils import AppSetting
from apps.notify.models import Notify
import logging
import json
import re


def send_fail_notify(task, msg=None):
    send_task_notify(task, False, msg or '请在任务计划执行历史中查看详情')


def send_analysis_notify(task, success, summary, analysis_ok=True):
    send_task_notify(task, success, summary, analyzed=True, analysis_ok=analysis_ok)


def send_task_notify(task, success, msg, analyzed=False, analysis_ok=True):
    rst_notify = json.loads(task.rst_notify or '{}')
    mode = rst_notify.get('mode')
    url = rst_notify.get('value')
    if mode != '0' and url:
        _do_notify(task, mode, url, success, msg, analyzed, analysis_ok)


def _do_notify(task, mode, url, success, msg, analyzed, analysis_ok):
    status = '成功' if success else '失败'
    title = ('AI 分析异常' if not analysis_ok else '任务 AI 分析通知') if analyzed else '任务执行失败通知'
    color = '#19be6b' if success and analysis_ok else '#f90202'
    description = msg or '请在任务计划执行历史中查看详情'
    if mode == '1':
        texts = [
            f'## <font color="{color}">{title}</font> ## ',
            f'**任务名称：** {task.name} ',
            f'**任务类型：** {task.type} ',
            f'**执行状态：** {status} ',
            f'**AI 分析：** {"完成" if analysis_ok else "异常"} ',
            f'**分析结果：** {description} ',
            f'**发生时间：** {human_datetime()} ',
            '> 来自 Spug运维平台'
        ]
        data = {
            'msgtype': 'markdown',
            'markdown': {'title': title, 'text': '\n\n'.join(texts)},
            'at': {'isAtAll': True}
        }
        Notification.handle_request(url, data, 'dd')
    elif mode == '2':
        data = {
            'task_id': task.id,
            'task_name': task.name,
            'task_type': task.type,
            'status': status,
            'ai_analyzed': analyzed,
            'ai_status': 'success' if analysis_ok else 'error',
            'message': description,
            'created_at': human_datetime()
        }
        Notification.handle_request(url, data)
    elif mode == '3':
        texts = [
            f'## <font color="{"info" if success and analysis_ok else "warning"}">{title}</font>',
            f'任务名称： {task.name}',
            f'任务类型： {task.type}',
            f'执行状态： {status}',
            f'AI 分析： {"完成" if analysis_ok else "异常"}',
            f'分析结果： {description}',
            f'发生时间： {human_datetime()}',
            '> 来自 Spug运维平台'
        ]
        data = {'msgtype': 'markdown', 'markdown': {'content': '\n'.join(texts)}}
        Notification.handle_request(url, data, 'wx')
    elif mode == '4':
        data = {
            'msg_type': 'post',
            'content': {
                'post': {
                    'zh_cn': {
                        'title': title,
                        'content': [
                            [{'tag': 'text', 'text': f'任务名称： {task.name}'}],
                            [{'tag': 'text', 'text': f'任务类型： {task.type}'}],
                            [{'tag': 'text', 'text': f'执行状态： {status}'}],
                            [{'tag': 'text', 'text': f'AI 分析： {"完成" if analysis_ok else "异常"}'}],
                            [{'tag': 'text', 'text': f'分析结果： {description}'}],
                            [{'tag': 'text', 'text': f'发生时间： {human_datetime()}'}],
                            [{'tag': 'at', 'user_id': 'all'}],
                        ]
                    }
                }
            }
        }
        Notification.handle_request(url, data, 'fs')
    elif mode == '5':
        _notify_by_mail(task, url, title, status, description, analyzed, analysis_ok)


def _notify_by_mail(task, receivers, title, status, description, analyzed, analysis_ok):
    """url 字段在邮件模式下存放收件人列表，支持逗号、分号或换行分隔。"""
    receivers = [x.strip() for x in re.split(r'[,;\s]+', receivers or '') if x.strip()]
    if not receivers:
        return
    mail_service = AppSetting.get_default('mail_service', {})
    # 邮件依赖自建 SMTP，未配置时给出可操作的站内提示，而不是静默失败
    if not mail_service.get('server'):
        Notify.make_monitor_notify(
            '发送任务通知失败', '未配置邮件服务，请在系统管理/系统设置/报警服务设置中配置。')
        return
    body = [
        f'任务名称： {task.name}',
        f'任务类型： {task.type}',
        f'执行状态： {status}',
    ]
    if analyzed:
        body.append(f'AI 分析： {"完成" if analysis_ok else "异常"}')
    body.extend([
        f'{"分析结果" if analyzed else "描述信息"}： {description}',
        f'发生时间： {human_datetime()}',
    ])
    try:
        mail = Mail(**mail_service)
        mail.send_text_mail(
            receivers, f'{title}-{task.name}',
            '\r\n'.join(body) + '\r\n\r\n自动发送，请勿回复。')
    except Exception as e:
        logging.warning(f'send task notify mail failed: {e}')
        Notify.make_monitor_notify(
            '发送任务通知邮件失败', f'收件人：{"、".join(receivers)}\n失败原因：{e}')
