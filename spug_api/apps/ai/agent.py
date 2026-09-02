# Copyright: (c) OpenSpug Organization. https://github.com/openspug/spug
# Copyright: (c) <spug.dev@gmail.com>
# Released under the AGPL-3.0 License.
"""智能体执行引擎。

诊断模式（diagnose）：只允许执行只读命令，收集信息后给出排查结论，不做任何变更。
修复模式（repair）：允许执行变更命令，每轮执行后复检目标是否恢复；
达到用户设定的循环上限仍未恢复则终止，并把完整过程通知出去。

所有模型往返与命令执行都会写入 AgentRecord，供事后排查。
"""
from django.conf import settings
from django.db import close_old_connections
from apps.ai.models import AgentSession

# 上下文体积上限（字符数，近似 1M token 级别的窗口）。
# 历史对话超过该值后自动压缩为摘要并抛弃原始历史，从摘要处继续会话。
CONTEXT_LIMIT = int(getattr(settings, 'AI_CONTEXT_LIMIT', 1024 * 1024))
# 分段摘要的单段大小，避免一次性把超长历史塞给模型
COMPRESS_CHUNK = 256 * 1024

CHAT_PROMPT = """你是一名资深 Linux 运维专家助手，正在与用户进行技术问答。
请用简洁、准确的中文回答用户的运维问题，必要时给出可执行的命令示例。
注意：当前为问答模式，你不能执行任何命令，只能给出建议。"""

AGENT_CHAT_PROMPT = """你是一名资深 Linux 运维专家，可以通过 SSH 操作用户指定的服务器来完成任务。

工作方式：
1. 需要在服务器上执行命令时，返回 commands 字段，系统会执行并把结果反馈给你。
2. 你可以连续多轮执行命令，直到收集到足够信息或完成任务。
3. 严禁执行破坏性命令：不得删除根目录、格式化磁盘、重启/关闭服务器、删除用户或数据库。
4. 每轮最多 5 条命令，必须非交互式，需要确认时加 -y，输出较大时请自行截断（如 tail -n 100）。
5. 任务完成或可以直接回答用户时，返回 done=true 并在 conclusion 中给出面向用户的完整回复。

你必须只返回 JSON，不要输出其他任何内容，格式：
{"done": false, "reason": "本轮要做什么", "commands": ["命令1", "命令2"]}
或：
{"done": true, "conclusion": "给用户的最终回复"}"""

DIAGNOSE_PROMPT = """你是一名资深 Linux 运维专家，正在排查一台服务器的告警问题。

严格要求：
1. 只能执行只读排查命令（如 ps/ss/netstat/systemctl status/journalctl/df/free/top -bn1/cat 日志等）。
2. 严禁执行任何修改系统状态的命令（不得 restart/start/stop/kill/rm/chmod/安装卸载等）。
3. 每轮最多给出 5 条命令，命令要具体可直接执行，不要使用交互式命令。
4. 命令必须带合理的输出截断（如 tail -n 100），避免输出过大。
5. 排查轮次有限，必须聚焦：第一轮就直接验证「排查重点」里指明的对象
   （如指定端口是否监听、指定进程是否存在、对应服务或容器的状态与退出原因），
   确认根因之前不要去查与告警对象无关的组件（如无关网卡、无关服务的日志）。
6. 一旦已经能解释告警原因，立即返回 done=true，不要为了凑轮次继续执行命令。

你必须只返回 JSON，不要输出其他任何内容，格式：
{"done": false, "reason": "本轮排查思路", "commands": ["命令1", "命令2"]}
当已经定位到原因、无需继续排查时返回：
{"done": true, "conclusion": "问题根因与影响分析", "suggestion": "建议的修复步骤（仅描述，不执行）"}"""

REPAIR_PROMPT = """你是一名资深 Linux 运维专家，正在自动修复一台服务器的故障。

严格要求：
1. 你可以执行修复命令（如 systemctl restart、启动进程、清理磁盘等）。
2. 严禁执行破坏性命令：不得删除根目录、格式化磁盘、重启/关闭服务器、删除用户或数据库。
3. 每轮最多给出 5 条命令，必须是非交互式的，需要确认的命令请加 -y。
4. 优先用最小代价恢复服务，先排查再动手，不要盲目重装。
5. 每轮执行后系统会自动复检故障是否恢复，并把结果反馈给你。
6. 作用范围必须严格限定在本次「告警对象」对应的服务/进程/端口上：
   - 不得重启、停止或改配置于与本次告警无关的服务，服务器上还跑着其他业务；
   - 不得执行整机级操作（重启主机、全局防火墙规则、系统级参数变更）；
   - 不得清理不属于该服务的文件或日志；
   - 如果判断必须动到无关组件才能恢复，请停止操作，返回 done=true 并在
     conclusion 中说明原因和需要人工介入的点。

你必须只返回 JSON，不要输出其他任何内容，格式：
{"done": false, "reason": "本轮修复思路", "commands": ["命令1", "命令2"]}
当你确认故障已修复或判断无法自动修复时返回：
{"done": true, "conclusion": "处理过程与结果说明", "suggestion": "后续建议"}"""

COMPRESS_PROMPT = """你是一名对话摘要助手。请把下面的运维对话压缩成一份摘要，要求：
1. 保留用户的目标与关键诉求、已确认的结论、已执行的重要操作及其结果。
2. 保留仍未解决的问题、待办事项和重要的环境信息（主机、服务、路径等）。
3. 丢弃寒暄、重复内容和过程性细节。
4. 若提供了「已有摘要」，请把新增对话合并进去，输出合并后的完整摘要。
直接输出摘要正文，不要输出其他任何内容。"""


def create_session(**kwargs):
    return AgentSession.objects.create(**kwargs)


def run_session(session, verifier=None):
    """监控告警触发的自动诊断/修复，委托 PydanticAI 引擎执行。"""
    from apps.ai import engine
    close_old_connections()
    try:
        return engine.run_session(session, verifier)
    finally:
        close_old_connections()


def run_chat(session_id, question):
    """后台线程入口：交互式会话执行一次提问。"""
    from apps.ai import engine
    close_old_connections()
    session = AgentSession.objects.filter(pk=session_id).first()
    if not session:
        return None
    try:
        return engine.run_chat(session, question)
    finally:
        close_old_connections()


def resume_chat(session_id, approved):
    """后台线程入口：用户确认高危命令后原地续跑。"""
    from apps.ai import engine
    close_old_connections()
    session = AgentSession.objects.filter(pk=session_id).first()
    if not session:
        return None
    try:
        return engine.resume_chat(session, approved)
    finally:
        close_old_connections()
