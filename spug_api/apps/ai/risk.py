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


# 会波及「本次故障对象之外」的破坏性操作。
# 修复模式虽然允许变更服务器，但作用范围必须限定在告警对象本身；
# 下面这些命令一旦执行，影响的是整机或其他业务的数据与本体，
# 因此即使模型有充分理由也不允许自行决定，必须由人确认。
CROSS_SERVICE_PATTERNS = [
    # Docker：批量清理与跨项目销毁
    r'\bdocker\s+(system|volume|image|network|builder)\s+prune\b',
    r'\bdocker\s+volume\s+rm\b',
    r'\bdocker\s+(rm|stop|kill|restart)\b[^|;]*\$\(',      # $(docker ps -aq) 批量取容器
    r'\bdocker\s+(rm|stop|kill|restart)\b[^|;]*\s-a\b',
    r'\bdocker\s+compose\b[^|;]*\bdown\b[^|;]*(-v\b|--volumes\b)',
    r'\bdocker\s+compose\b[^|;]*--remove-orphans\b',       # 会删除同项目名下的其他容器
    # 数据库：删库删表
    r'\b(drop|truncate)\s+(table|database|schema)\b',
    r'\bdelete\s+from\b',
    # 文件系统：批量删除与数据目录递归删除
    r'\bfind\b[^|;]*-delete\b',
    r'\bfind\b[^|;]*-exec\s+rm\b',
    r'\bxargs\b[^|;]*\brm\b',
    r'\brm\s+-[a-zA-Z]*r[a-zA-Z]*\s+[^|;]*(/var/lib|/var/www|/data|/opt|/srv|/home)\b',
    # 包管理：批量卸载
    r'\b(apt|apt-get|yum|dnf)\s+(autoremove|purge)\b',
    # 服务：全局停用与批量杀进程
    r'\bsystemctl\s+\S*\s*--all\b',
    r'\bkillall\b',
    r'\bpkill\s+[^|;]*-u\b',
]


def check_command(command, mode):
    """返回风险原因，无风险时返回 None。

    分三层：
    * DANGEROUS_PATTERNS —— 任何模式都不允许模型自行执行；
    * CROSS_SERVICE_PATTERNS —— 会波及告警对象之外的服务或数据，
      修复与对话模式下同样需要人工确认，防止「为了修 A 而删掉 B」；
    * WRITE_COMMAND_PATTERNS —— 仅诊断模式禁止，保证只读承诺成立。
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
    for pattern in CROSS_SERVICE_PATTERNS:
        if re.search(pattern, text, re.IGNORECASE):
            return '该命令会影响本次故障对象之外的服务或数据，需要人工确认'
    return None
