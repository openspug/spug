# Copyright: (c) OpenSpug Organization. https://github.com/openspug/spug
# Copyright: (c) <spug.dev@gmail.com>
# Released under the AGPL-3.0 License.
import requests

push_server = 'https://push.spug.cc'


def get_balance(token):
    res = requests.get(f'{push_server}/spug/balance/', json={'token': token})
    if res.status_code != 200:
        raise Exception(f'status code: {res.status_code}')
    res = res.json()
    if res.get('error'):
        raise Exception(res['error'])
    return res['data']


def get_contacts(token):
    try:
        res = requests.post(f'{push_server}/spug/contacts/', json={'token': token})
        res = res.json()
        if res['data']:
            return res['data']
    except Exception:
        return []
