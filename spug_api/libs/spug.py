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


def send_login_wx_code(wx_token, code):
    url = f'{spug_server}/apis/login/wx/'
    spug_key = AppSetting.get_default('spug_key')
    res = requests.post(url, json={'token': spug_key, 'user': wx_token, 'code': code}, timeout=30)
    if res.status_code != 200:
        raise Exception(f'status code: {res.status_code}')
    res = res.json()
    if res.get('error'):
        raise Exception(res['error'])


class Notification:
    def __init__(self, grp, event, target, title, message, duration):
        self.grp = grp
        self.event = event
        self.title = title
        self.target = target
        self.message = message
        self.duration = duration
        self.spug_key = AppSetting.get_default('spug_key')
        self.u_ids = []

    @staticmethod
    def handle_request(url, data, mode=None):
        try:
            res = requests.post(url, json=data, timeout=15)
        except Exception as e:
            return Notify.make_system_notify('通知发送失败', f'接口调用异常: {e}')
        if res.status_code != 200:
            return Notify.make_system_notify('通知发送失败', f'返回状态码：{res.status_code}, 请求URL：{res.url}')

        if mode in ['dd', 'wx']:
            res = res.json()
            if res.get('errcode') == 0:
                return
        elif mode == 'spug':
            res = res.json()
            if not res.get('error'):
                return
        elif mode == 'fs':
            res = res.json()
            if res.get('StatusCode') == 0:
                return
        else:
            raise NotImplementedError
        Notify.make_system_notify('通知发送失败', f'返回数据：{res}')

    def monitor_by_wx(self, users):
        if not self.spug_key:
            Notify.make_monitor_notify('发送报警信息失败', '未配置报警服务调用凭据，请在系统管理/系统设置/基本设置/调用凭据中配置。')
            return
        data = {
            'token': self.spug_key,
            'event': self.event,
            'subject': f'{self.title} >> {self.target}',
            'desc': self.message,
            'remark': f'故障持续{self.duration}' if self.event == '2' else None,
            'users': list(users)
        }
        self.handle_request(f'{spug_server}/apis/notify/wx/', data, 'spug')

    def monitor_by_email(self, users):
        mail_service = AppSetting.get_default('mail_service', {})
        body = [
            f'告警名称：{self.title}',
            f'告警对象：{self.target}',
            f'{"告警" if self.event == "1" else "恢复"}时间：{human_datetime()}',
            f'告警描述：{self.message}'
        ]
        if self.event == '2':
            body.append('故障持续：' + self.duration)
        if mail_service.get('server'):
            event_map = {'1': '监控告警通知', '2': '告警恢复通知'}
            subject = f'{event_map[self.event]}-{self.title}'
            mail = Mail(**mail_service)
            mail.send_text_mail(users, subject, '\r\n'.join(body) + '\r\n\r\n自动发送，请勿回复。')
        elif self.spug_key:
            data = {
                'token': self.spug_key,
                'event': self.event,
                'subject': self.title,
                'body': '\r\n'.join(body),
                'users': list(users)
            }
            self.handle_request(f'{spug_server}/apis/notify/mail/', data, 'spug')
        else:
            Notify.make_monitor_notify('发送报警信息失败', '未配置报警服务调用凭据，请在系统管理/系统设置/报警服务设置中配置。')

    def monitor_by_dd(self, users):
        texts = [
            '## %s ## ' % ('监控告警通知' if self.event == '1' else '告警恢复通知'),
            f'**告警名称：** <font color="#{"f90202" if self.event == "1" else "008000"}">{self.title}</font> ',
            f'**告警对象：** {self.target} ',
            f'**{"告警" if self.event == "1" else "恢复"}时间：** {human_datetime()} ',
            f'**告警描述：** {self.message} ',
        ]
        if self.event == '2':
            texts.append(f'**持续时间：** {self.duration} ')
        data = {
            'msgtype': 'markdown',
            'markdown': {
                'title': '监控告警通知',
                'text': '\n\n'.join(texts) + '\n\n> ###### 来自 Spug运维平台'
            },
            'at': {
                'isAtAll': True
            }
        }
        for url in users:
            self.handle_request(url, data, 'dd')

    def monitor_by_qy_wx(self, users):
        color, title = ('warning', '监控告警通知') if self.event == '1' else ('info', '告警恢复通知')
        texts = [
            f'## {title}',
            f'**告警名称：** <font color="{color}">{self.title}</font> ',
            f'**告警对象：** {self.target}',
            f'**{"告警" if self.event == "1" else "恢复"}时间：** {human_datetime()} ',
            f'**告警描述：** {self.message} ',
        ]
        if self.event == '2':
            texts.append(f'**持续时间：** {self.duration} ')
        data = {
            'msgtype': 'markdown',
            'markdown': {
                'content': '\n'.join(texts) + '\n> 来自 Spug运维平台'
            }
        }
        for url in users:
            self.handle_request(url, data, 'wx')

    def dispatch_monitor(self, modes):
        self.u_ids = sum([json.loads(x.contacts) for x in Group.objects.filter(id__in=self.grp)], [])
        for mode in modes:
            if mode == '1':
                users = set(x.wx_token for x in Contact.objects.filter(id__in=self.u_ids, wx_token__isnull=False))
                if not users:
                    Notify.make_monitor_notify('发送报警信息失败', '未找到可用的通知对象，请确保设置了相关报警联系人的微信Token。')
                    continue
                self.monitor_by_wx(users)
            elif mode == '3':
                users = set(x.ding for x in Contact.objects.filter(id__in=self.u_ids, ding__isnull=False))
                if not users:
                    Notify.make_monitor_notify('发送报警信息失败', '未找到可用的通知对象，请确保设置了相关报警联系人的钉钉。')
                    continue
                self.monitor_by_dd(users)
            elif mode == '4':
                users = set(x.email for x in Contact.objects.filter(id__in=self.u_ids, email__isnull=False))
                if not users:
                    Notify.make_monitor_notify('发送报警信息失败', '未找到可用的通知对象，请确保设置了相关报警联系人的邮件地址。')
                    continue
                self.monitor_by_email(users)
            elif mode == '5':
                users = set(x.qy_wx for x in Contact.objects.filter(id__in=self.u_ids, qy_wx__isnull=False))
                if not users:
                    Notify.make_monitor_notify('发送报警信息失败', '未找到可用的通知对象，请确保设置了相关报警联系人的企业微信。')
                    continue
                self.monitor_by_qy_wx(users)
