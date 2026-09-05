# Copyright: (c) OpenSpug Organization. https://github.com/openspug/spug
# Copyright: (c) <spug.dev@gmail.com>
# Released under the AGPL-3.0 License.
"""推送助手（push.spug.cc）客户端。

该模块自 3.0 分支移植，除账户绑定/余额查询/登录验证码外，额外提供 send_message
供流水线的「推送助手」节点复用。所有对外请求均设置超时，避免执行线程被挂住。
"""
import requests

push_server = 'https://push.spug.cc'


def get_balance(token):
    res = requests.get(f'{push_server}/spug/balance/', json={'token': token}, timeout=15)
    if res.status_code != 200:
        raise Exception(f'status code: {res.status_code}')
    res = res.json()
    if res.get('error'):
        raise Exception(res['error'])
    return res['data']


def get_contacts(token):
    """获取绑定账户下可用的推送对象。

    失败时抛异常而不是吞成空列表——否则「没绑定」和「绑了但 token 失效／服务不可达」
    在界面上长得一模一样，使用者会照着错误的提示去重新绑定。
    """
    res = requests.post(f'{push_server}/spug/contacts/', json={'token': token}, timeout=15)
    if res.status_code != 200:
        raise Exception(f'status code: {res.status_code}')
    res = res.json()
    if res.get('error'):
        raise Exception(res['error'])
    return res.get('data') or []


def send_message(token, targets, source, dataset):
    """向推送助手投递一条消息，失败抛出异常由调用方决定如何呈现。"""
    url = f'{push_server}/spug/message/'
    data = {
        'token': token,
        'targets': list(targets),
        'source': source,
        'dataset': dataset,
    }
    res = requests.post(url, json=data, timeout=15)
    if res.status_code != 200:
        raise Exception(f'status code: {res.status_code}')
    res = res.json()
    if res.get('error'):
        raise Exception(res['error'])
    return res.get('data')


def send_login_code(token, user, code):
    send_message(token, [user], 'mfa', {'code': code})


def send_mfa_code(target, code):
    """发送登录 MFA 验证码。

    MFA 唯一的下发通道是推送助手，未绑定就发不出去；这里统一抛异常，
    由调用方转成用户可见的错误，避免「提示已发送但其实没发」。
    """
    from apps.setting.utils import AppSetting

    token = AppSetting.get_default('spug_push_key')
    if not token:
        raise Exception('未绑定推送助手账户，请在系统管理/系统设置/推送服务设置中绑定后再使用MFA认证。')
    if not target:
        raise Exception('当前账户未配置推送对象ID，请在账户管理中配置后再使用MFA认证。')
    send_login_code(token, target, code)
