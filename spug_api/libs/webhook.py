# Copyright: (c) OpenSpug Organization. https://github.com/openspug/spug
# Copyright: (c) <spug.dev@gmail.com>
# Released under the AGPL-3.0 License.
"""群机器人 Webhook 推送（钉钉 / 飞书 / 企业微信）。

这里只做「组装报文 + 发送 + 校验返回」，不依赖任何 Django 模型，方便流水线、
监控告警等场景共用，也便于单独测试。发送失败统一抛出带可读信息的异常，由调用方
决定是记录到终端输出还是写系统通知。

签名算法差异（容易写反，注意）：
  钉钉：secret 作为密钥，对 "{timestamp}\\n{secret}" 取 HMAC-SHA256，timestamp 为毫秒；
  飞书：把 "{timestamp}\\n{secret}" 当作密钥，对空字符串取 HMAC-SHA256，timestamp 为秒；
  企业微信：不支持加签，仅靠 webhook key 本身。
"""
import requests
import hashlib
import base64
import hmac
import time
from urllib.parse import urlencode

TIMEOUT = 15


def gen_dd_sign(secret):
    timestamp = str(int(time.time() * 1000))
    string_to_sign = f'{timestamp}\n{secret}'
    hmac_code = hmac.new(secret.encode('utf-8'), string_to_sign.encode('utf-8'), digestmod=hashlib.sha256).digest()
    sign = base64.b64encode(hmac_code).decode('utf-8')
    return timestamp, sign


def gen_fs_sign(secret):
    timestamp = str(int(time.time()))
    string_to_sign = f'{timestamp}\n{secret}'
    hmac_code = hmac.new(string_to_sign.encode('utf-8'), b'', digestmod=hashlib.sha256).digest()
    sign = base64.b64encode(hmac_code).decode('utf-8')
    return timestamp, sign


def _request(url, data, mode):
    try:
        res = requests.post(url, json=data, timeout=TIMEOUT)
    except Exception as e:
        raise Exception(f'接口调用异常: {e}')
    if res.status_code != 200:
        raise Exception(f'返回状态码: {res.status_code}')
    try:
        body = res.json()
    except Exception:
        raise Exception(f'返回内容解析失败: {res.text[:200]}')

    if mode in ('dd', 'wx'):
        if body.get('errcode') == 0:
            return body
        raise Exception(f'{body.get("errmsg") or body}')
    elif mode == 'fs':
        # 新版自定义机器人返回 code，旧版返回 StatusCode，两者都要认
        if body.get('code') == 0 or body.get('StatusCode') == 0:
            return body
        raise Exception(f'{body.get("msg") or body.get("StatusMessage") or body}')
    raise NotImplementedError(mode)


def _hard_breaks(text):
    """把单个换行转成 markdown 硬换行（行尾补两个空格）。

    钉钉的 markdown 按标准 markdown 处理软换行：单个 \\n 会被合并成同一行。
    用行尾双空格而不是 \\n\\n，是为了断行的同时不多出一个空行；用户自己写的空行
    （段落间隔）仍然原样保留。
    """
    return '\n'.join(line if not line.strip() else line.rstrip() + '  ' for line in text.split('\n'))


def push_dd(url, secret, title, content, at_all=False):
    """钉钉群机器人，markdown 消息。"""
    if secret:
        timestamp, sign = gen_dd_sign(secret)
        sep = '&' if '?' in url else '?'
        url = f'{url}{sep}{urlencode({"timestamp": timestamp, "sign": sign})}'
    text = _hard_breaks(content)
    if at_all:
        # 钉钉 markdown 需要正文出现 @所有人 字样才会高亮，配合 isAtAll 才能真正提醒
        text = f'{text}\n\n@所有人'
    data = {
        'msgtype': 'markdown',
        'markdown': {'title': title, 'text': text},
        'at': {'isAtAll': bool(at_all)},
    }
    return _request(url, data, 'dd')


def push_fs(url, secret, title, content, at_all=False, color='blue'):
    """飞书自定义机器人，交互式卡片（lark_md 支持 markdown，与钉钉观感一致）。"""
    text = content
    if at_all:
        text = f'{content}\n<at id=all></at>'
    data = {
        'msg_type': 'interactive',
        'card': {
            'config': {'wide_screen_mode': True},
            'header': {
                'title': {'tag': 'plain_text', 'content': title},
                'template': color,
            },
            'elements': [{'tag': 'div', 'text': {'tag': 'lark_md', 'content': text}}],
        },
    }
    if secret:
        timestamp, sign = gen_fs_sign(secret)
        data['timestamp'] = timestamp
        data['sign'] = sign
    return _request(url, data, 'fs')


def push_wx(url, title, content, at_all=False):
    """企业微信群机器人，markdown 消息。返回 None 或一条告警描述。

    企业微信的 markdown 不支持 @，要提醒所有人只能再补一条 text 消息，
    因此 at_all 时会发两条：先内容，后提醒。第二条失败不算推送失败——正文已经
    送达了，把节点标成失败会误导使用者，这里降级成告警。
    """
    data = {
        'msgtype': 'markdown',
        'markdown': {'content': content},
    }
    _request(url, data, 'wx')
    if at_all:
        notice = {
            'msgtype': 'text',
            'text': {'content': title, 'mentioned_list': ['@all']},
        }
        try:
            _request(url, notice, 'wx')
        except Exception as e:
            return f'消息已送达，但 @所有人 的提醒消息发送失败: {e}'
    return None
