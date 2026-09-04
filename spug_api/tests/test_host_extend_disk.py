# Copyright: (c) OpenSpug Organization. https://github.com/openspug/spug
# Copyright: (c) <spug.dev@gmail.com>
# Released under the AGPL-3.0 License.
# fetch_host_extend 的磁盘探测逻辑测试（issue #721：小于 10GB 的磁盘未在扩展信息中展示）
import sys
import types


def _stub(name, **attrs):
    """注入轻量 stub，避免导入 django_redis / paramiko 等运行环境依赖"""
    module = types.ModuleType(name)
    for key, value in attrs.items():
        setattr(module, key, value)
    sys.modules.setdefault(name, module)
    return module


_stub('django_redis', get_redis_connection=lambda *a, **kw: None)
_stub('libs.helper', make_ali_request=None, make_tencent_request=None)
_stub('libs.ssh', SSH=object, AuthenticationException=type('AuthenticationException', (Exception,), {}))
_stub('apps.host.models', HostExtend=object)
_stub('apps.setting.utils', AppSetting=object)

from apps.host.utils import fetch_host_extend


class FakeSSH:
    """按命令返回预设输出 (code, out)，未预设的命令视为测试编写错误"""

    def __init__(self, commands):
        self.commands = commands
        self.arguments = {}

    def exec_command_raw(self, command):
        if command not in self.commands:
            raise AssertionError(f'未预设的探测命令: {command}')
        return self.commands[command]


GB = 1024 ** 3
KIB = 1024

# 各命令输出与 spug_api/apps/host/utils.py 中 fetch_host_extend 的探测命令一一对应
COMMON_COMMANDS = {
    'nproc': (0, '4'),
    "cat /etc/os-release | grep PRETTY_NAME | awk -F \\\" '{print $2}'": (0, 'Debian GNU/Linux 12'),
    'hostname -I 2> /dev/null': (0, '192.168.1.10'),
    "dmidecode -t 17 2> /dev/null | grep -E 'Size: [0-9]+' | awk '{s+=$2} END {print s,$3}'": (1, ''),
    "free -m | awk 'NR==2{print $2}'": (0, '8192'),
}


def test_lsblk_shows_disks_smaller_than_10gb():
    # lsblk -b 输出单位为字节，这里给出 8G / 10G / 40G / 512G 四块整盘
    sizes_gb = [8, 10, 40, 512]
    lsblk_out = '\n'.join(str(int(size * GB)) for size in sizes_gb)
    commands = dict(COMMON_COMMANDS)
    commands['lsblk -dbn -o SIZE -e 11 2> /dev/null'] = (0, lsblk_out)
    response = fetch_host_extend(FakeSSH(commands))
    assert response['disk'] == sizes_gb


def test_proc_partitions_shows_disks_smaller_than_10gb():
    # /proc/partitions 的 #blocks 单位为 1KiB：120G 的 sda、5G 的 sdb、10G 的 nvme0n1，
    # 以及应被 WHOLE_DISK_REGEX 过滤掉的分区 sda1
    partitions = (
        '  major minor  #blocks  name\n'
        f'      7    0  {120 * GB // KIB}  sda\n'
        f'      7    1  {119 * GB // KIB}  sda1\n'
        f'      7   16  {5 * GB // KIB}  sdb\n'
        f'    259    0  {10 * GB // KIB}  nvme0n1\n'
    )
    commands = dict(COMMON_COMMANDS)
    commands['lsblk -dbn -o SIZE -e 11 2> /dev/null'] = (1, '')
    commands['cat /proc/partitions'] = (0, partitions)
    response = fetch_host_extend(FakeSSH(commands))
    assert response['disk'] == [120, 5, 10]
