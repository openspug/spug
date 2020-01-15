# Copyright: (c) OpenSpug Organization. https://github.com/openspug/spug
# Copyright: (c) <spug.dev@gmail.com>
# Released under the MIT License.
from apps.alarm.models import Group, Contact
from apps.setting.utils import AppSetting
from apps.notify.models import Notify
import requests
import json

spug_server = 'http://spug-wx.qbangmang.com'
notify_source = 'info-circle'


def _parse_args(n_grp):
    spug_key = AppSetting.get_default('spug_key')
    if not spug_key:
        Notify.make_notify(notify_source, '1', '发送报警信息失败', '未配置报警服务调用凭据，请在系统管理/系统设置/报警服务设置中配置。')
        return None, None
    return spug_key, [json.loads(x.contacts) for x in Group.objects.filter(id__in=n_grp)]


def notify_by_wx(event, subject, n_grp):
    spug_key, u_ids = _parse_args(n_grp)
    if u_ids is None:
        return
    users = [x.wx_token for x in Contact.objects.filter(id__in=sum(u_ids, []), wx_token__isnull=False)]
    if users:
        data = {
            'token': spug_key,
            'event': event,
            'subject': subject,
            'users': users
        }
        requests.post(f'{spug_server}/apis/notify/wx/', json=data)


def notify_by_sms():
    pass


def notify_by_email():
    pass
