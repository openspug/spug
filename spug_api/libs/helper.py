# Copyright: (c) OpenSpug Organization. https://github.com/openspug/spug
# Copyright: (c) <spug.dev@gmail.com>
# Released under the AGPL-3.0 License.
from urllib.parse import quote, urlencode
from datetime import datetime
from pytz import timezone
import requests
import hashlib
import base64
import random
import time
import hmac
import uuid


def _special_url_encode(value) -> str:
    if isinstance(value, (str, bytes)):
        rst = quote(value)
    else:
        rst = urlencode(value)
    return rst.replace('+', '%20').replace('*', '%2A').replace('%7E', '~')


def _make_ali_signature(key: str, params: dict) -> bytes:
    sorted_str = _special_url_encode(dict(sorted(params.items())))
    sign_str = 'GET&%2F&' + _special_url_encode(sorted_str)
    sign_digest = hmac.new(key.encode(), sign_str.encode(), hashlib.sha1).digest()
    return base64.encodebytes(sign_digest).strip()


def _make_tencent_signature(endpoint: str, key: str, params: dict) -> bytes:
    sorted_str = '&'.join(f'{k}={v}' for k, v in sorted(params.items()))
    sign_str = f'POST{endpoint}/?{sorted_str}'
    sign_digest = hmac.new(key.encode(), sign_str.encode(), hashlib.sha1).digest()
    return base64.encodebytes(sign_digest).strip()


def make_ali_request(ak, ac, endpoint, params):
    params.update(
        AccessKeyId=ak,
        Format='JSON',
        SignatureMethod='HMAC-SHA1',
        SignatureNonce=uuid.uuid4().hex,
        SignatureVersion='1.0',
        Timestamp=datetime.now(tz=timezone('UTC')).strftime('%Y-%m-%dT%H:%M:%SZ'),
        Version='2014-05-26'
    )
    params['Signature'] = _make_ali_signature(ac + '&', params)
    return requests.get(endpoint, params).json()


def make_tencent_request(ak, ac, endpoint, params):
    params.update(
        Nonce=int(random.random() * 10000),
        SecretId=ak,
        Timestamp=int(time.time()),
        Version='2017-03-12'
    )
    params['Signature'] = _make_tencent_signature(endpoint, ac, params)
    return requests.post(f'https://{endpoint}', data=params).json()
