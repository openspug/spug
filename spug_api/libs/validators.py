# Copyright: (c) OpenSpug Organization. https://github.com/openspug/spug
# Copyright: (c) <spug.dev@gmail.com>
# Released under the MIT License.
import ipaddress
from datetime import datetime


# 判断是否是ip地址
def ip_validator(value):
    try:
        ipaddress.ip_address(value)
        return True
    except ValueError:
        return False


# 判断是否是日期字符串，支持 2018-04-11 或 2018-04-11 14:55:30
def date_validator(value: str) -> bool:
    value = value.strip()
    try:
        if len(value) == 10:
            datetime.strptime(value, '%Y-%m-%d')
            return True
        elif len(value) == 19:
            datetime.strptime(value, '%Y-%m-%d %H:%M:%S')
            return True
    except ValueError:
        pass
    return False
