# Copyright: (c) <spug.dev@gmail.com>
# Released under the AGPL-3.0 License.
"""命令风险规则。

独立成模块供执行引擎与入口层共用，避免 agent 与 engine 相互导入。
"""
import re

# 无论哪种模式都禁止直接执行的高危命令。
# 交互式会话中挂起等待人工确认；无人值守场景直接拒绝并要求模型换方案。
DANGEROUS_PATTERNS = [
    r'\brm\s+(-[a-zA-Z]*\s+)*/(\s|$)',
    r'\brm\s+-[a-zA-Z]*[rf][a-zA-Z]*\s+/(\s|$|\*)',
    r'\bmkfs(\.|\s)',
    r'\bdd\s+.*of=/dev/',
    r'>\s*/dev/[sh]d[a-z]',
    r'\b(shutdown|reboot|halt|poweroff)\b',
    r'\binit\s+0\b',
    r':\(\)\s*\{.*\}\s*;\s*:',           # fork bomb
    r'\bchmod\s+(-[a-zA-Z]+\s+)*777\s+/(\s|$)',
    r'\buserdel\b|\bgroupdel\b',
    r'\bdrop\s+database\b',
    r'\biptables\s+-F\b',
]

# 诊断模式额外禁止的写操作。
# 诊断只允许「连上去看」，任何会改变服务器状态的命令都必须拦下，
# 否则「只检测」的承诺就不成立。按「会不会产生副作用」而非命令名划分。
WRITE_COMMAND_PATTERNS = [
    r'\b(rm|mv|cp|touch|mkdir|rmdir|truncate|tee|chmod|chown|chgrp|ln|install)\b',
    # systemctl/service 只放行只读子命令，其余一律拦截
    r'\bsystemctl\s+(?!(status|show|list-|is-|cat|get-default|show-environment)\b)',
    r'\bservice\s+\S+\s+(?!status\b)',
    r'\b(kill|killall|pkill)\b',
    r'\b(apt|apt-get|yum|dnf|pip|pip3|npm|docker|podman)\b\s+'
    r'(install|remove|rm|run|start|stop|restart|exec|cp|kill|update|prune)',
    r'\b(iptables|ip6tables|firewall-cmd|ufw|nft)\b',
    # sed/awk 原地改写
    r'\bsed\b[^|;]*\s-i\b',
    r'\bgawk\b[^|;]*\s-i\b',
    # 下载落盘
    r'\bcurl\b[^|;]*\s(-[oO]\b|--output\b|--remote-name\b)',
    r'\b(wget|rsync|scp|sftp)\b',
    # 内联脚本可绕开一切前缀判断
    r'\b(python|python2|python3|perl|ruby|php|node)\b[^|;]*\s-(c|e)\b',
    # 文件系统与运行环境
    r'\b(mount|umount|swapon|swapoff|sysctl\s+-w|modprobe|insmod|rmmod)\b',
    r'\b(useradd|usermod|passwd|chpasswd)\b',
    r'\bgit\s+(checkout|reset|clean|pull|merge|rebase|apply|stash)\b',
    r'\b(nohup|setsid|at|batch)\b',
    r'\bcrontab\s+-[er]\b',
    # 输出重定向到文件（放行 2>&1 与 /dev/null）
    r'>>?\s*(?!&)(?!/dev/null\b)[^\s&|]',
]


def check_command(command, mode):
    """返回风险原因，无风险时返回 None。

    mode 为 diagnose 时额外禁止一切写操作。
    """
    text = (command or '').strip()
    if not text:
        return '空命令'
    for pattern in DANGEROUS_PATTERNS:
        if re.search(pattern, text, re.IGNORECASE):
            return '高危命令，需要人工确认'
    if mode == 'diagnose':
        for pattern in WRITE_COMMAND_PATTERNS:
            if re.search(pattern, text, re.IGNORECASE):
                return '诊断模式只允许只读命令'
    return None
