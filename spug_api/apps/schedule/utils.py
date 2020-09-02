# Copyright: (c) OpenSpug Organization. https://github.com/openspug/spug
# Copyright: (c) <spug.dev@gmail.com>
# Released under the AGPL-3.0 License.
from apps.schedule.models import Task, History
from apps.notify.models import Notify
from libs.utils import human_datetime
from threading import Thread
import requests
import json


def auto_clean_schedule_history():
    for task in Task.objects.all():
        try:
            record = History.objects.filter(task_id=task.id)[50]
            History.objects.filter(task_id=task.id, id__lt=record.id).delete()
        except IndexError:
            pass


def send_fail_notify(task, msg=None):
    rst_notify = json.loads(task.rst_notify)
    mode = rst_notify.get('mode')
    url = rst_notify.get('value')
    if mode != '0' and url:
        Thread(target=_do_notify, args=(task, mode, url, msg)).start()


def _do_notify(task, mode, url, msg):
    if mode == '1':
        texts = [
            '## <font color="#f90202">任务执行失败通知</font> ## ',
            f'**任务名称：** {task.name} ',
            f'**任务类型：** {task.type} ',
            f'**描述信息：** {msg or "请在任务计划执行历史中查看详情"} ',
            f'**发生时间：** {human_datetime()} ',
            '> 来自 Spug运维平台'
        ]
        data = {
            'msgtype': 'markdown',
            'markdown': {
                'title': '任务执行失败通知',
                'text': '\n\n'.join(texts)
            }
        }
        requests.post(url, json=data)
    elif mode == '2':
        data = {
            'task_id': task.id,
            'task_name': task.name,
            'task_type': task.type,
            'message': msg or '请在任务计划执行历史中查看详情',
            'created_at': human_datetime()
        }
        requests.post(url, json=data)
    elif mode == '3':
        texts = [
            '## <font color="warning">任务执行失败通知</font>',
            f'任务名称： {task.name}',
            f'任务类型： {task.type}',
            f'描述信息： {msg or "请在任务计划执行历史中查看详情"}',
            f'发生时间： {human_datetime()}',
            '> 来自 Spug运维平台'
        ]
        data = {
            'msgtype': 'markdown',
            'markdown': {
                'content': '\n'.join(texts)
            }
        }
        res = requests.post(url, json=data)
        if res.status_code != 200:
            Notify.make_notify('schedule', '1', '任务执行通知发送失败', f'返回状态码：{res.status_code}, 请求URL：{url}')
        if mode in ['1', '3']:
            res = res.json()
            if res.get('errcode') != 0:
                Notify.make_notify('schedule', '1', '任务执行通知发送失败', f'返回数据：{res}')
