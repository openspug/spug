# Copyright: (c) OpenSpug Organization. https://github.com/openspug/spug
# Copyright: (c) <spug.dev@gmail.com>
# Released under the AGPL-3.0 License.
import ipaddress
import re
from datetime import datetime

# 空白与 shell 元字符：路径会经 SSH 交给远端 shell，或作为 rsync/sshfs 的远端参数被远端 shell 再解析一次
_unsafe_path_chars = re.compile(r'[\s;|&$`<>()\'"\\*?{}\[\]!]')
_env_name = re.compile(r'[A-Za-z_][A-Za-z0-9_-]*\Z')


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


# 判断是否是可安全交给远端 shell 的绝对路径：以 / 开头，不含空白与 shell 元字符
def path_validator(value) -> bool:
    if not isinstance(value, str):
        return False
    value = value.strip()
    return value.startswith('/') and not _unsafe_path_chars.search(value)


# 判断是否是合法的环境变量名（参数名会作为环境变量名拼进 export 语句）；连字符会在 export 前被替换为下划线
def is_env_name(value) -> bool:
    return isinstance(value, str) and bool(_env_name.match(value))
