# Copyright: (c) OpenSpug Organization. https://github.com/openspug/spug
# Copyright: (c) <spug.dev@gmail.com>
# Released under the MIT License.
from apps.alarm.models import Group, Contact
from apps.setting.utils import AppSetting
from apps.notify.models import Notify
from libs.mail import Mail
from libs.utils import human_datetime
import requests
import json

spug_server = 'http://spug-wx.qbangmang.com'
notify_source = 'info-circle'


def _parse_args(grp):
    spug_key = AppSetting.get_default('spug_key')
    if not spug_key:
        Notify.make_notify(notify_source, '1', '发送报警信息失败', '未配置报警服务调用凭据，请在系统管理/系统设置/报警服务设置中配置。')
        return None, None
    return spug_key, sum([json.loads(x.contacts) for x in Group.objects.filter(id__in=grp)], [])


def notify_by_wx(event, subject, n_grp):
    spug_key, u_ids = _parse_args(n_grp)
    if u_ids is None:
        return
    users = set(x.wx_token for x in Contact.objects.filter(id__in=u_ids, wx_token__isnull=False))
    if users:
        data = {
            'token': spug_key,
            'event': event,
            'subject': subject,
            'users': list(users)
        }
        requests.post(f'{spug_server}/apis/notify/wx/', json=data)


def notify_by_email(event, subject, grp):
    spug_key, u_ids = _parse_args(grp)
    if u_ids is None:
        return
    users = set(x.email for x in Contact.objects.filter(id__in=u_ids, email__isnull=False))
    if users:
        mail_service = json.loads(AppSetting.get_default('mail_service', '{}'))
        if mail_service.get('server'):
            event_map = {'1': '告警', '2': '恢复'}
            subject = f'{event_map[event]}-{subject}'
            mail = Mail(**mail_service)
            mail.send_text_mail(users, subject, f'{subject}\r\n\r\n自动发送，请勿回复。')
        else:
            data = {
                'token': spug_key,
                'event': event,
                'subject': subject,
                'users': list(users)
            }
            requests.post(f'{spug_server}/apis/notify/mail/', json=data)


def notify_by_dd(event, subject, grp):
    spug_key, u_ids = _parse_args(grp)
    if u_ids is None:
        return
    users = set(x.ding for x in Contact.objects.filter(id__in=u_ids, email__isnull=False))
    if users:
        texts = [
            '## %s ## ' % '监控告警通知' if event == '1' else '告警恢复通知',
            f'**告警名称：** <font color="#{"f90202" if event == "1" else "8ece60"}">{subject}</font> ',
            f'**告警时间：** {human_datetime()} ',
            '**告警描述：** %s ' % '请在运维平台监控中心查看详情' if event == '1' else '告警已恢复',
            '> ###### 来自 Spug运维平台'
        ]
        data = {
            'msgtype': 'markdown',
            'markdown': {
                'title': '监控告警通知',
                'text': '\n\n'.join(texts)
            }
        }
        for url in users:
            requests.post(url, json=data)
