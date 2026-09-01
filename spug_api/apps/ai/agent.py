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
from apps.ai.models import AgentSession, AgentRecord, McpServer, Skill
from apps.ai.client import chat, extract_json, AIError
from apps.ai import stream, mcp
from libs import human_datetime
import logging
import json
import re

# 上下文体积上限（字符数，近似 1M token 级别的窗口）。
# 历史对话超过该值后自动压缩为摘要并抛弃原始历史，从摘要处继续会话。
CONTEXT_LIMIT = int(getattr(settings, 'AI_CONTEXT_LIMIT', 1024 * 1024))
# 分段摘要的单段大小，避免一次性把超长历史塞给模型
COMPRESS_CHUNK = 256 * 1024

# 无论哪种模式都禁止执行的高危命令，命中直接拒绝并让模型换方案
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

# 诊断模式额外禁止的写操作前缀
WRITE_COMMAND_PATTERNS = [
    r'\b(rm|mv|cp|touch|mkdir|rmdir|truncate|tee|chmod|chown|chgrp|ln)\b',
    r'\b(systemctl|service)\s+(start|stop|restart|reload|enable|disable)\b',
    r'\b(kill|killall|pkill)\b',
    r'\b(apt|apt-get|yum|dnf|pip|pip3|npm|docker)\b\s+(install|remove|rm|run|start|stop|restart)',
    r'\b(iptables|firewall-cmd|ufw)\b',
    r'>>?\s*/',
    r'\bcrontab\s+-[er]\b',
]

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


def _check_command(command, mode):
    """返回风险原因，无风险时返回 None。

    风险命令在交互式会话中会挂起等待用户确认；在无人值守的告警自动处理中
    没有人可确认，只能跳过并把原因反馈给模型，让它改用更安全的方案。
    """
    text = command.strip()
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


class Agent:
    def __init__(self, session, verifier=None):
        """verifier: 可选的复检函数，返回 (is_ok, message)，用于修复模式判断是否恢复。"""
        self.session = session
        self.verifier = verifier
        self.messages = []

    def _record(self, kind, content, loop=0, extra=None):
        AgentRecord.objects.create(
            session=self.session,
            loop=loop,
            kind=kind,
            content=content or '',
            extra=json.dumps(extra, ensure_ascii=False) if extra else None)

    def _build_context(self):
        host = self.session.host
        lines = [
            f'服务器：{host.name}（{host.hostname}）',
            f'告警对象：{self.session.target or "-"}',
            f'告警信息：{self.session.trigger_message or "-"}',
        ]
        if self.session.mode == 'repair':
            lines.append(f'最大修复轮次：{self.session.max_loops}')
        return '\n'.join(lines)

    def _exec(self, ssh, command):
        try:
            exit_code, output = ssh.exec_command_raw(command)
        except Exception as e:
            return -1, f'命令执行异常: {e}'
        # 控制回传给模型的体积，避免超长上下文
        if output and len(output) > 4000:
            output = output[:4000] + '\n...（输出已截断）'
        return exit_code, output

    def run(self):
        session = self.session
        prompt = DIAGNOSE_PROMPT if session.mode == 'diagnose' else REPAIR_PROMPT
        context = self._build_context()
        self._record('context', context)
        self.messages = [
            {'role': 'system', 'content': prompt},
            {'role': 'user', 'content': f'{context}\n\n请开始处理。'},
        ]

        max_loops = max(1, int(session.max_loops or 3))
        try:
            with session.host.get_ssh() as ssh:
                for loop in range(1, max_loops + 1):
                    session.used_loops = loop
                    session.save(update_fields=['used_loops'])

                    content, model_name = chat(self.messages)
                    if not session.model_name:
                        session.model_name = model_name
                        session.save(update_fields=['model_name'])
                    self.messages.append({'role': 'assistant', 'content': content})

                    data = extract_json(content)
                    if not data:
                        self._record('error', f'模型返回格式无法解析：{content[:500]}', loop)
                        self.messages.append({
                            'role': 'user',
                            'content': '你的回复不是合法 JSON，请严格按要求只返回 JSON 对象。'})
                        continue

                    if data.get('done'):
                        return self._finish(data, loop, resolved=None)

                    self._record('thought', data.get('reason') or '', loop)
                    commands = [x for x in (data.get('commands') or []) if isinstance(x, str)][:5]
                    if not commands:
                        self.messages.append({
                            'role': 'user',
                            'content': '你没有给出任何命令，请给出具体命令或返回 done=true 结束。'})
                        continue

                    feedback = []
                    for command in commands:
                        reject = _check_command(command, session.mode)
                        if reject:
                            # 告警自动处理无人值守，无法弹窗确认，跳过并要求模型换方案
                            self._record('command', command, loop,
                                         extra={'rejected': f'{reject}（无人值守场景自动跳过）'})
                            feedback.append(
                                f'$ {command}\n[已跳过] {reject}。当前为无人值守的自动处理，'
                                f'无法进行人工确认，请改用不触发该风险的方案。')
                            continue
                        self._record('command', command, loop)
                        exit_code, output = self._exec(ssh, command)
                        self._record('output', output, loop, extra={'exit_code': exit_code})
                        feedback.append(f'$ {command}\n[exit={exit_code}]\n{output}')

                    # 修复模式每轮结束后复检故障是否已恢复
                    if session.mode == 'repair' and self.verifier:
                        is_ok, verify_msg = self.verifier()
                        self._record('verify', verify_msg, loop, extra={'is_ok': is_ok})
                        feedback.append(f'\n[自动复检] {"已恢复" if is_ok else "仍然异常"}：{verify_msg}')
                        if is_ok:
                            return self._finish(
                                {'conclusion': f'故障已恢复：{verify_msg}',
                                 'suggestion': data.get('reason') or ''},
                                loop, resolved=True)

                    self.messages.append({'role': 'user', 'content': '\n\n'.join(feedback)})

            # 循环用尽仍未结束
            return self._finish(None, max_loops, resolved=False)
        except AIError as e:
            self._record('error', str(e))
            return self._abort(f'AI调用失败：{e}')
        except Exception as e:
            logging.exception('agent run failed')
            self._record('error', str(e))
            return self._abort(f'执行异常：{e}')

    def _finish(self, data, loop, resolved):
        session = self.session
        if data:
            conclusion = data.get('conclusion') or ''
            suggestion = data.get('suggestion') or ''
            summary = conclusion if not suggestion else f'{conclusion}\n\n【建议】{suggestion}'
        else:
            summary = f'已达到最大轮次（{loop}），仍未确认故障恢复，已终止自动处理。'
        if session.mode == 'diagnose':
            session.status = 'success' if data else 'failed'
        else:
            session.status = 'success' if resolved else 'failed'
        session.summary = summary
        session.used_loops = loop
        session.finished_at = human_datetime()
        session.save(update_fields=['status', 'summary', 'used_loops', 'finished_at'])
        self._record('summary', summary, loop)
        return session

    def _abort(self, message):
        session = self.session
        session.status = 'error'
        session.summary = message
        session.finished_at = human_datetime()
        session.save(update_fields=['status', 'summary', 'finished_at'])
        return session


def create_session(**kwargs):
    return AgentSession.objects.create(**kwargs)


def run_session(session, verifier=None):
    close_old_connections()
    return Agent(session, verifier).run()


def _history_messages(session, limit=40):
    """把已有记录还原成模型可理解的多轮上下文。

    仅回放用户提问与 AI 面向用户的回复，命令执行细节不进入历史上下文，
    避免长会话把 token 迅速撑爆。已被压缩的历史（summary_record_id 之前）
    不再回放原文，改为回放压缩摘要。
    """
    messages = []
    if session.context_summary:
        messages.append({
            'role': 'user',
            'content': f'【历史对话摘要】更早的对话已压缩为以下摘要：\n{session.context_summary}'})
        messages.append({'role': 'assistant', 'content': '好的，我已了解此前对话的背景，请继续。'})
    records = list(session.records
                   .filter(kind__in=('question', 'answer'), id__gt=session.summary_record_id or 0)
                   .order_by('id'))
    for item in records[max(0, len(records) - limit):]:
        role = 'user' if item.kind == 'question' else 'assistant'
        messages.append({'role': role, 'content': item.content})
    return messages


def compress_context(session):
    """历史上下文超过 CONTEXT_LIMIT 时压缩总结并抛弃原始历史。

    分段调用模型做增量摘要（已有摘要 + 新增对话 → 合并摘要），
    完成后把 summary_record_id 推进到最后一条记录，此前历史不再进入上下文。
    返回是否发生了压缩。
    """
    records = list(session.records
                   .filter(kind__in=('question', 'answer'), id__gt=session.summary_record_id or 0)
                   .order_by('id'))
    size = len(session.context_summary or '') + sum(len(x.content or '') for x in records)
    if size <= CONTEXT_LIMIT or not records:
        return False

    def summarize(prev, text):
        prefix = f'已有摘要：\n{prev}\n\n' if prev else ''
        content, _ = chat([
            {'role': 'system', 'content': COMPRESS_PROMPT},
            {'role': 'user', 'content': f'{prefix}新增对话：\n{text}'},
        ])
        return content.strip()

    summary = session.context_summary or ''
    chunk, chunk_size = [], 0
    for item in records:
        role = '用户' if item.kind == 'question' else 'AI'
        chunk.append(f'{role}：{item.content}')
        chunk_size += len(item.content or '')
        if chunk_size >= COMPRESS_CHUNK:
            summary = summarize(summary, '\n\n'.join(chunk))
            chunk, chunk_size = [], 0
    if chunk:
        summary = summarize(summary, '\n\n'.join(chunk))

    session.context_summary = summary
    session.summary_record_id = records[-1].id
    session.save(update_fields=['context_summary', 'summary_record_id'])
    return True


def _build_skill_section():
    """返回 (提示词片段, {名称: Skill})。技能只注入名称与用途，正文按需加载。"""
    skills = list(Skill.objects.filter(is_active=True))
    if not skills:
        return '', {}
    lines = ['\n可用技能（按需加载完整内容）：']
    for item in skills:
        lines.append(f'- {item.name}：{item.description}')
    lines.append('需要参考某个技能时，返回 {"done": false, "skill": "技能名称"}，'
                 '系统会把技能完整内容发给你，然后再继续任务。')
    return '\n'.join(lines), {x.name: x for x in skills}


def _build_tool_section():
    """返回 (提示词片段, {(服务名, 工具名): McpServer})。"""
    catalog = {}
    lines = []
    for server in McpServer.objects.filter(is_active=True):
        tools = json.loads(server.tools_cache) if server.tools_cache else []
        for item in tools:
            if not item.get('name'):
                continue
            catalog[(server.name, item['name'])] = server
            schema = json.dumps(item.get('inputSchema') or {}, ensure_ascii=False)
            if len(schema) > 600:
                schema = schema[:600] + '...'
            lines.append(f"- {server.name}/{item['name']}：{item.get('description') or ''}"
                         f"\n  参数 Schema：{schema}")
    if not lines:
        return '', {}
    section = ('\n可用 MCP 工具：\n' + '\n'.join(lines) +
               '\n需要调用工具时，返回 {"done": false, "reason": "调用原因", '
               '"tool": {"server": "服务名", "name": "工具名", "arguments": {参数对象}}}，'
               '系统会执行并把结果反馈给你。每轮只能调用一个工具。')
    return section, catalog


class ChatAgent:
    """对话式智能体：支持纯问答，以及可操作服务器的 Agent 模式。

    模型输出通过 Redis 事件总线实时推送给前端；遇到高危命令时不再直接拒绝，
    而是保存断点现场并置为 waiting，由用户确认后调用 resume 继续执行。
    """

    def __init__(self, session):
        self.session = session

    # ---------- 基础设施 ----------

    def _emit(self, event_type, **payload):
        payload['type'] = event_type
        try:
            stream.publish(self.session.id, payload)
        except Exception as e:
            logging.warning(f'publish stream event failed: {e}')

    def _record(self, kind, content, loop=0, extra=None, emit=True):
        item = AgentRecord.objects.create(
            session=self.session,
            turn=self.session.turn,
            loop=loop,
            kind=kind,
            content=content or '',
            extra=json.dumps(extra, ensure_ascii=False) if extra else None)
        if emit:
            self._emit('record', record=item.to_view())
        return item

    def _exec(self, ssh, command):
        try:
            exit_code, output = ssh.exec_command_raw(command)
        except Exception as e:
            return -1, f'命令执行异常: {e}'
        if output and len(output) > 4000:
            output = output[:4000] + '\n...（输出已截断）'
        return exit_code, output

    def _chat(self, messages, thinking=False):
        """调用模型并把增量文本推送给前端。"""
        buffer = []

        def on_delta(text):
            if text is None:
                buffer.clear()
                self._emit('delta_reset')
                return
            buffer.append(text)
            self._emit('delta', text=text, thinking=thinking)

        self._emit('delta_start', thinking=thinking)
        try:
            content, model_name = chat(messages, on_delta=on_delta)
        finally:
            self._emit('delta_end')
        self._remember_model(model_name)
        return content

    # ---------- 入口 ----------

    def ask(self, question):
        session = self.session
        try:
            self._compress_if_needed()
            if session.mode == 'chat' or not session.host_id:
                return self._plain_chat()
            messages = self._build_messages()
            return self._agent_loop(messages, start_loop=1)
        except AIError as e:
            self._record('error', str(e))
            return self._settle('error', f'AI调用失败：{e}')
        except Exception as e:
            logging.exception('chat agent failed')
            self._record('error', str(e))
            return self._settle('error', f'执行异常：{e}')

    def resume(self, approved):
        """用户确认高危命令后从断点继续。"""
        session = self.session
        pending = json.loads(session.pending) if session.pending else None
        if not pending:
            return session
        session.pending = None
        session.status = 'running'
        session.save(update_fields=['pending', 'status'])

        messages = pending['messages']
        loop = pending['loop']
        feedback = pending['feedback']
        command = pending['command']
        rest = pending['rest']
        try:
            with session.host.get_ssh() as ssh:
                if approved:
                    self._record('command', command, loop, extra={'approved': True})
                    exit_code, output = self._exec(ssh, command)
                    self._record('output', output, loop, extra={'exit_code': exit_code})
                    feedback.append(f'$ {command}\n[exit={exit_code}]\n{output}')
                else:
                    self._record('command', command, loop, extra={'rejected': '用户拒绝执行该高危命令'})
                    feedback.append(f'$ {command}\n[用户拒绝执行]')

                result = self._run_commands(ssh, rest, loop, messages, feedback)
                if result is not None:
                    return result
                messages.append({'role': 'user', 'content': '\n\n'.join(feedback)})
                return self._agent_loop(messages, start_loop=loop + 1, ssh=ssh)
        except AIError as e:
            self._record('error', str(e))
            return self._settle('error', f'AI调用失败：{e}')
        except Exception as e:
            logging.exception('resume failed')
            self._record('error', str(e))
            return self._settle('error', f'执行异常：{e}')

    # ---------- 具体模式 ----------

    def _compress_if_needed(self):
        """历史超过上限时先压缩再继续，压缩过程对用户可见。"""
        try:
            if compress_context(self.session):
                self._record('compress', '历史对话过长，已自动压缩为摘要，后续对话基于摘要继续。')
        except AIError as e:
            # 压缩失败不阻断本次对话，超限历史仍会被 limit 截断兜底
            logging.warning(f'compress context failed: {e}')

    def _plain_chat(self):
        messages = [{'role': 'system', 'content': CHAT_PROMPT}]
        messages.extend(_history_messages(self.session))
        content = self._chat(messages)
        self._record('answer', content)
        return self._settle('idle', None)

    def _build_messages(self):
        host = self.session.host
        header = f'当前服务器：{host.name}（{host.hostname}）'
        skill_section, _ = _build_skill_section()
        tool_section, _ = _build_tool_section()
        prompt = f'{AGENT_CHAT_PROMPT}{skill_section}{tool_section}\n\n{header}'
        messages = [{'role': 'system', 'content': prompt}]
        messages.extend(_history_messages(self.session))
        return messages

    def _use_skill(self, name, loop):
        """按需加载技能正文并反馈给模型。"""
        skill = Skill.objects.filter(name=name, is_active=True).first()
        if not skill:
            feedback = f'技能【{name}】不存在或未启用，请勿再请求该技能。'
        else:
            feedback = f'技能【{skill.name}】完整内容如下：\n{skill.content}'
        self._record('skill', name, loop, extra={'found': bool(skill)})
        return feedback

    def _call_tool(self, spec, loop):
        """执行一次 MCP 工具调用并返回反馈文本。"""
        server_name = (spec or {}).get('server')
        tool_name = (spec or {}).get('name')
        arguments = (spec or {}).get('arguments') or {}
        label = f'{server_name}/{tool_name}'
        if not server_name or not tool_name:
            return f'工具调用格式错误：{json.dumps(spec, ensure_ascii=False)[:200]}'
        server = McpServer.objects.filter(name=server_name, is_active=True).first()
        if not server:
            return f'MCP 服务【{server_name}】不存在或未启用。'
        self._record('tool', label, loop, extra={'arguments': arguments})
        try:
            output, is_error = mcp.call_tool(server, tool_name, arguments)
        except mcp.McpError as e:
            output, is_error = f'调用失败：{e}', True
        except Exception as e:
            logging.exception('mcp call failed')
            output, is_error = f'调用异常：{e}', True
        self._record('tool_result', output, loop, extra={'is_error': is_error})
        return f'[MCP {label}] {"(失败)" if is_error else ""}\n{output}'

    def _run_commands(self, ssh, commands, loop, messages, feedback):
        """执行一批命令。遇到高危命令时保存断点并返回会话（挂起）。"""
        for index, command in enumerate(commands):
            risk = _check_command(command, 'repair')
            if risk:
                self.session.pending = json.dumps({
                    'messages': messages,
                    'loop': loop,
                    'feedback': feedback,
                    'command': command,
                    'reason': risk,
                    'rest': commands[index + 1:],
                }, ensure_ascii=False)
                self.session.status = 'waiting'
                self.session.save(update_fields=['pending', 'status'])
                self._record('confirm', command, loop, extra={'reason': risk})
                self._emit('waiting', command=command, reason=risk)
                return self.session
            self._record('command', command, loop)
            exit_code, output = self._exec(ssh, command)
            self._record('output', output, loop, extra={'exit_code': exit_code})
            feedback.append(f'$ {command}\n[exit={exit_code}]\n{output}')
        return None

    def _agent_loop(self, messages, start_loop, ssh=None):
        session = self.session
        max_loops = max(1, int(session.max_loops or 5))
        own_ssh = ssh is None
        conn = session.host.get_ssh() if own_ssh else None
        ssh = conn.__enter__() if own_ssh else ssh
        try:
            loop = start_loop
            while loop <= max_loops:
                content = self._chat(messages, thinking=True)
                messages.append({'role': 'assistant', 'content': content})

                data = extract_json(content)
                if not data:
                    # 模型没按 JSON 返回时，直接把文本当作面向用户的回复
                    self._record('answer', content)
                    return self._settle('idle', None)

                if data.get('done'):
                    self._record('answer', data.get('conclusion') or '（无内容）')
                    return self._settle('idle', None)

                if data.get('reason'):
                    self._record('thought', data['reason'], loop)

                # 技能加载与 MCP 工具调用：单独占一轮，结果反馈后继续
                if data.get('skill'):
                    messages.append({'role': 'user', 'content': self._use_skill(data['skill'], loop)})
                    loop += 1
                    continue
                if data.get('tool'):
                    messages.append({'role': 'user', 'content': self._call_tool(data['tool'], loop)})
                    loop += 1
                    continue

                commands = [x for x in (data.get('commands') or []) if isinstance(x, str)][:5]
                if not commands:
                    messages.append({
                        'role': 'user',
                        'content': '你没有给出命令，请直接返回 done=true 并在 conclusion 中回复用户。'})
                    loop += 1
                    continue

                feedback = []
                result = self._run_commands(ssh, commands, loop, messages, feedback)
                if result is not None:
                    return result
                messages.append({'role': 'user', 'content': '\n\n'.join(feedback)})
                loop += 1

            note = f'已达到单次最大执行轮次（{max_loops}），如需继续请再次提问。'
            self._record('answer', note)
            return self._settle('idle', None)
        finally:
            if own_ssh:
                conn.__exit__(None, None, None)

    # ---------- 状态 ----------

    def _remember_model(self, model_name):
        if self.session.model_name != model_name:
            self.session.model_name = model_name
            self.session.save(update_fields=['model_name'])

    def _settle(self, status, summary):
        session = self.session
        session.status = status
        if summary:
            session.summary = summary
        session.finished_at = human_datetime()
        session.save(update_fields=['status', 'summary', 'finished_at'])
        self._emit('done', status=status, summary=summary)
        return session


def run_chat(session_id, question):
    """后台线程入口：独立于请求事务执行模型调用与命令执行。"""
    close_old_connections()
    session = AgentSession.objects.filter(pk=session_id).first()
    if not session:
        return None
    try:
        return ChatAgent(session).ask(question)
    finally:
        close_old_connections()


def resume_chat(session_id, approved):
    """后台线程入口：用户确认高危命令后继续执行。"""
    close_old_connections()
    session = AgentSession.objects.filter(pk=session_id).first()
    if not session:
        return None
    try:
        return ChatAgent(session).resume(approved)
    finally:
        close_old_connections()
