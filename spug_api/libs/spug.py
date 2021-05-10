# Copyright: (c) OpenSpug Organization. https://github.com/openspug/spug
# Copyright: (c) <spug.dev@gmail.com>
# Released under the AGPL-3.0 License.
from apps.alarm.models import Group, Contact
from apps.setting.utils import AppSetting
from apps.notify.models import Notify
from libs.mail import Mail
from libs.utils import human_datetime
import requests
import json

spug_server = 'https://api.spug.cc'
notify_source = 'monitor'


def _parse_args(grp):
    spug_key = AppSetting.get_default('spug_key')
    return spug_key, sum([json.loads(x.contacts) for x in Group.objects.filter(id__in=grp)], [])


def _handle_response(res, mode):
    if res.status_code != 200:
        Notify.make_notify(notify_source, '1', '告警通知发送失败', f'返回状态码：{res.status_code}, 请求URL：{res.url}')
    if mode in ['dd', 'wx']:
        res = res.json()
        if res.get('errcode') != 0:
            Notify.make_notify(notify_source, '1', '告警通知发送失败', f'返回数据：{res}')
    if mode == 'spug':
        res = res.json()
        if res.get('error'):
            Notify.make_notify(notify_source, '1', '告警通知发送失败', f'错误信息：{res}')


def notify_by_wx(event, obj):
    spug_key, u_ids = _parse_args(obj.grp)
    if not spug_key:
        Notify.make_notify(notify_source, '1', '发送报警信息失败', '未配置报警服务调用凭据，请在系统管理/系统设置/报警服务设置中配置。')
        return
    users = set(x.wx_token for x in Contact.objects.filter(id__in=u_ids, wx_token__isnull=False))
    if users:
        data = {
            'token': spug_key,
            'event': event,
            'subject': obj.name,
            'desc': obj.out,
            'remark': f'故障持续{obj.duration}' if event == '2' else None,
            'users': list(users)
        }
        res = requests.post(f'{spug_server}/apis/notify/wx/', json=data)
        _handle_response(res, 'spug')
    else:
        Notify.make_notify(notify_source, '1', '发送报警信息失败', '未找到可用的通知对象，请确保设置了相关报警联系人的微信Token。')


def notify_by_email(event, obj):
    spug_key, u_ids = _parse_args(obj.grp)
    users = set(x.email for x in Contact.objects.filter(id__in=u_ids, email__isnull=False))
    if users:
        mail_service = json.loads(AppSetting.get_default('mail_service', '{}'))
        body = ['告警名称：' + obj.name, '告警时间：' + human_datetime(), '告警描述：' + obj.out]
        if event == '2':
            body.append('故障持续：' + obj.duration)
        if mail_service.get('server'):
            event_map = {'1': '告警发生', '2': '告警恢复'}
            subject = f'{event_map[event]}-{obj.name}'
            mail = Mail(**mail_service)
            mail.send_text_mail(users, subject, '\r\n'.join(body) + '\r\n\r\n自动发送，请勿回复。')
        elif spug_key:
            data = {
                'token': spug_key,
                'event': event,
                'subject': obj.name,
                'body': '\r\n'.join(body),
                'users': list(users)
            }
            res = requests.post(f'{spug_server}/apis/notify/mail/', json=data)
            _handle_response(res, 'spug')
        else:
            Notify.make_notify(notify_source, '1', '发送报警信息失败', '未配置报警服务调用凭据，请在系统管理/系统设置/报警服务设置中配置。')
    else:
        Notify.make_notify(notify_source, '1', '发送报警信息失败', '未找到可用的通知对象，请确保设置了相关报警联系人的邮件地址。')


def notify_by_dd(event, obj):
    _, u_ids = _parse_args(obj.grp)
    users = set(x.ding for x in Contact.objects.filter(id__in=u_ids, ding__isnull=False))
    if users:
        texts = [
            '## %s ## ' % ('监控告警通知' if event == '1' else '告警恢复通知'),
            f'**告警名称：** <font color="#{"f90202" if event == "1" else "008000"}">{obj.name}</font> ',
            f'**告警时间：** {human_datetime()} ',
            f'**告警描述：** {obj.out} ',
        ]
        if event == '2':
            texts.append(f'**持续时间：** {obj.duration} ')
        data = {
            'msgtype': 'markdown',
            'markdown': {
                'title': '监控告警通知',
                'text': '\n\n'.join(texts) + '\n\n> ###### 来自 Spug运维平台'
            }
        }
        for url in users:
            res = requests.post(url, json=data)
            _handle_response(res, 'dd')
    else:
        Notify.make_notify(notify_source, '1', '发送报警信息失败', '未找到可用的通知对象，请确保设置了相关报警联系人的钉钉。')


def notify_by_qy_wx(event, obj):
    _, u_ids = _parse_args(obj.grp)
    users = set(x.qy_wx for x in Contact.objects.filter(id__in=u_ids, qy_wx__isnull=False))
    if users:
        color, title = ('warning', '监控告警通知') if event == '1' else ('info', '告警恢复通知')
        texts = [
            f'## {title}',
            f'**告警名称：** <font color="{color}">{obj.name}</font> ',
            f'**告警时间：** {human_datetime()} ',
            f'**告警描述：** {obj.out} ',
        ]
        if event == '2':
            texts.append(f'**持续时间：** {obj.duration} ')
        data = {
            'msgtype': 'markdown',
            'markdown': {
                'content': '\n'.join(texts) + '\n> 来自 Spug运维平台'
            }
        }
        for url in users:
            res = requests.post(url, json=data)
            _handle_response(res, 'wx')
    else:
        Notify.make_notify(notify_source, '1', '发送报警信息失败', '未找到可用的通知对象，请确保设置了相关报警联系人的企业微信。')
