# Copyright: (c) <spug.dev@gmail.com>
# Released under the AGPL-3.0 License.
"""基于 PydanticAI 的智能体执行引擎。

相比早期「提示词约定 JSON」的实现，这里改用模型原生的 function calling：

* 命令执行、技能加载、MCP 调用都是标准工具，模型不再需要手写 JSON，
  也就不存在「解析失败导致任务静默中断」的问题；
* 多个只读工具可并行执行，SSH 命令通过 sequential=True 强制串行，保证执行顺序；
* 高危命令抛出 ApprovalRequired，本次运行以 DeferredToolRequests 结束，
  现场存入 AgentSession.messages，用户确认后原地续跑，不重放已执行过的命令。

对外只暴露 run_session / run_chat / resume_chat 三个入口，
所有过程仍完整写入 AgentRecord，并通过 stream 推送给前端。
"""
from django.conf import settings
from django.db import close_old_connections
from pydantic_ai import (
    Agent as _PydanticAgent,
    ApprovalRequired,
    DeferredToolRequests,
    DeferredToolResults,
    ModelMessagesTypeAdapter,
    RunContext,
    ToolDenied,
)
from pydantic_ai.messages import (
    FunctionToolCallEvent,
    PartDeltaEvent,
    PartStartEvent,
    TextPartDelta,
    ThinkingPartDelta,
)
from pydantic_ai.models.fallback import FallbackModel
from pydantic_ai.models.openai import OpenAIChatModel
from pydantic_ai.providers.openai import OpenAIProvider
from pydantic_ai.settings import ModelSettings
from pydantic_ai.tools import Tool
from pydantic_core import to_jsonable_python
from libs import human_datetime
from dataclasses import dataclass
from typing import Any
import pydantic_ai
import asyncio
import logging
import json
import re

SDK_VERSION = getattr(pydantic_ai, '__version__', 'unknown')

# 单条命令输出回传给模型的上限。长上下文模型下不必卡得太死，
# 否则日志类排查会因为截断丢掉关键信息。
OUTPUT_LIMIT = int(getattr(settings, 'AI_OUTPUT_LIMIT', 20000))
# 消息历史的字符预算。按字符而非条数控制，长会话才不会被条数上限误伤。
# 中文约 1.5~2 字符/token，默认 120 万字符对应约 60~80 万 token，
# 在 100 万上下文模型下留有余量。
CONTEXT_BUDGET = int(getattr(settings, 'AI_CONTEXT_LIMIT', 1200000))
# 兜底的条数上限，防止极端情况下消息条数过多拖慢序列化
HISTORY_LIMIT = int(getattr(settings, 'AI_HISTORY_LIMIT', 2000))


def _tool_slug(text):
    """把 MCP 服务名/工具名转成合法的工具标识。"""
    return re.sub(r'[^0-9a-zA-Z_]', '_', str(text or ''))[:48]


@dataclass
class Deps:
    """工具执行期间需要的运行时依赖。"""
    session: Any
    runner: Any
    ssh: Any = None
    # 无人值守（监控自动处理）：没有人能确认高危命令，只能跳过并要求模型换方案
    unattended: bool = False
    # diagnose 模式只允许只读命令
    mode: str = 'repair'


class AgentRunner:
    """统一驱动 PydanticAI 事件循环，并把过程翻译成 AgentRecord / SSE 事件。

    emit=True 时（交互式会话）会把模型增量与记录实时推给前端；
    emit=False 时（监控自动处理）只落库，不产生实时事件。
    """

    def __init__(self, session, verifier=None, emit=True, unattended=False):
        self.session = session
        self.verifier = verifier
        self.emit_enabled = emit
        self.unattended = unattended
        self.loop_no = 0
        self._verified = None      # 修复模式复检结果：True 表示故障已恢复
        self._verify_msg = ''

    # ---------- 记录与事件 ----------

    def emit(self, event_type, **payload):
        if not self.emit_enabled:
            return
        payload['type'] = event_type
        try:
            from apps.ai import stream
            stream.publish(self.session.id, payload)
        except Exception as e:
            logging.warning(f'publish stream event failed: {e}')

    def record(self, kind, content, extra=None, emit=True):
        """写入执行记录。工具在线程池中执行，写库前先回收失效连接。"""
        from apps.ai.models import AgentRecord
        close_old_connections()
        item = AgentRecord.objects.create(
            session=self.session,
            turn=getattr(self.session, 'turn', 0) or 0,
            loop=self.loop_no,
            kind=kind,
            content=content or '',
            extra=json.dumps(extra, ensure_ascii=False) if extra else None)
        if emit:
            self.emit('record', record=item.to_view())
        return item

    # ---------- 命令执行 ----------

    def exec_command(self, ssh, command):
        try:
            exit_code, output = ssh.exec_command_raw(command)
        except Exception as e:
            return -1, f'命令执行异常: {e}'
        if output and len(output) > OUTPUT_LIMIT:
            output = output[:OUTPUT_LIMIT] + '\n...（输出已截断）'
        return exit_code, output

    # ---------- 消息历史 ----------

    def load_history(self):
        """还原上次运行的消息历史；版本不一致时丢弃，避免反序列化出错。"""
        raw = self.session.messages
        if not raw:
            return None
        if self.session.sdk_version and self.session.sdk_version != SDK_VERSION:
            logging.warning(
                f'agent session {self.session.id} sdk version changed '
                f'{self.session.sdk_version} -> {SDK_VERSION}, history dropped')
            return None
        try:
            return ModelMessagesTypeAdapter.validate_python(json.loads(raw))
        except Exception as e:
            logging.warning(f'restore agent history failed: {e}')
            return None

    def save_history(self, messages):
        """持久化消息历史，供下一轮对话或审批续跑使用。"""
        try:
            data = to_jsonable_python(messages)
        except Exception as e:
            logging.warning(f'serialize agent history failed: {e}')
            return
        data = self._trim(data)
        self.session.messages = json.dumps(data, ensure_ascii=False)
        self.session.sdk_version = SDK_VERSION
        self.session.save(update_fields=['messages', 'sdk_version'])

    @staticmethod
    def _has_orphan_return(item):
        """该消息是否含有「工具返回」——单独保留会成为孤儿。"""
        parts = item.get('parts') or []
        return any(p.get('part_kind') in ('tool-return', 'retry-prompt') for p in parts)

    @classmethod
    def _trim(cls, data):
        """按字符预算裁剪历史，保留首条任务上下文与最近的对话。

        三条约束：
        1. 首条消息（原始任务/提问）必须保住，否则长会话跑到后期模型会忘记目标；
        2. 保留段的首条不能是「孤儿工具返回」——有返回却无对应调用时，
           OpenAI 兼容网关会直接返回 400；
        3. 预算按字符计，避免长会话被固定条数上限误伤。
        """
        if not data:
            return data
        total = sum(len(json.dumps(x, ensure_ascii=False)) for x in data)
        if total <= CONTEXT_BUDGET and len(data) <= HISTORY_LIMIT:
            return data

        head, rest = data[:1], data[1:]
        head_size = len(json.dumps(head[0], ensure_ascii=False))
        budget = max(0, CONTEXT_BUDGET - head_size)

        kept, used = [], 0
        for item in reversed(rest):
            size = len(json.dumps(item, ensure_ascii=False))
            if used + size > budget or len(kept) + 1 >= HISTORY_LIMIT:
                break
            kept.append(item)
            used += size
        kept.reverse()

        while kept and cls._has_orphan_return(kept[0]):
            kept.pop(0)

        if len(kept) < len(rest):
            head = head + [{
                'kind': 'request',
                'parts': [{
                    'part_kind': 'user-prompt',
                    'content': f'【历史已压缩】此前省略了 {len(rest) - len(kept)} 条较早的消息，'
                               f'仅保留任务目标与最近的执行过程。',
                }],
            }]
        return head + kept


def _build_model(session):
    """按「主模型优先、其余降级」构造模型，复用配置中心的模型列表。"""
    from apps.ai.client import AIError
    from apps.ai.models import AIModel
    items = list(AIModel.objects.filter(is_active=True))
    if not items:
        raise AIError('未配置可用的AI模型，请在配置中心/模型配置中添加并启用')
    items.sort(key=lambda x: (not x.is_default, x.sort_id))
    models = []
    for item in items:
        provider = OpenAIProvider(base_url=item.base_url.rstrip('/'), api_key=item.api_key)
        models.append(OpenAIChatModel(item.model, provider=provider))
    if session is not None and not session.model_name:
        session.model_name = items[0].name
        session.save(update_fields=['model_name'])
    return models[0] if len(models) == 1 else FallbackModel(*models), items


def _make_ssh_tool(runner):
    """SSH 执行工具。

    sequential=True 让同一批工具调用中的命令按模型给出的顺序逐条执行，
    避免修复类操作被并发打乱；只读的 MCP 工具不受影响，仍可并行。
    """
    from apps.ai.risk import check_command

    def ssh_exec(ctx: RunContext[Deps], command: str) -> str:
        """在目标服务器上执行一条 shell 命令，返回退出码与输出。"""
        deps = ctx.deps
        command = (command or '').strip()
        if not command:
            return '命令为空，请给出具体命令。'

        risk = check_command(command, deps.mode)
        if risk:
            if deps.unattended:
                # 无人值守场景没有人能确认，跳过并让模型换更安全的方案
                deps.runner.record('command', command,
                                   extra={'rejected': f'{risk}（无人值守自动跳过）'})
                return (f'[已跳过] {risk}。当前为无人值守的自动处理，无法进行人工确认，'
                        f'请改用不触发该风险的方案。')
            if not ctx.tool_call_approved:
                # 交互式会话：挂起本次运行，等用户确认后原地续跑
                raise ApprovalRequired

        approved_extra = {'approved': True} if ctx.tool_call_approved else None
        deps.runner.record('command', command, extra=approved_extra)
        exit_code, output = deps.runner.exec_command(deps.ssh, command)
        deps.runner.record('output', output, extra={'exit_code': exit_code})
        return f'[exit={exit_code}]\n{output}'

    return Tool(ssh_exec, takes_ctx=True, sequential=True)


def _make_skill_tool(runner):
    def load_skill(ctx: RunContext[Deps], name: str) -> str:
        """按名称加载一份运维技能（操作手册）的完整内容。"""
        from apps.ai.models import Skill
        close_old_connections()
        skill = Skill.objects.filter(name=name, is_active=True).first()
        ctx.deps.runner.record('skill', name, extra={'found': bool(skill)})
        if not skill:
            return f'技能【{name}】不存在或未启用，请勿再请求该技能。'
        return f'技能【{skill.name}】完整内容：\n{skill.content}'

    return Tool(load_skill, takes_ctx=True)


def _make_mcp_tools(runner):
    """把已启用的 MCP 工具注册为原生工具，保留其原始参数 Schema。"""
    from apps.ai.models import McpServer
    from apps.ai import mcp

    tools, catalog = [], {}
    for server in McpServer.objects.filter(is_active=True):
        try:
            items = json.loads(server.tools_cache) if server.tools_cache else []
        except (ValueError, TypeError):
            continue
        for item in items:
            raw_name = item.get('name')
            if not raw_name:
                continue
            tool_name = f'mcp_{_tool_slug(server.name)}_{_tool_slug(raw_name)}'
            if tool_name in catalog:
                continue
            catalog[tool_name] = (server, raw_name)
            schema = item.get('inputSchema') or {}
            if not isinstance(schema, dict) or schema.get('type') != 'object':
                schema = {'type': 'object', 'properties': {}}
            schema.setdefault('properties', {})

            def _call(_server=server, _raw=raw_name, _label=None, **kwargs):
                label = f'{_server.name}/{_raw}'
                runner.record('tool', label, extra={'arguments': kwargs})
                try:
                    output, is_error = mcp.call_tool(_server, _raw, kwargs)
                except mcp.McpError as e:
                    output, is_error = f'调用失败：{e}', True
                except Exception as e:
                    logging.exception('mcp call failed')
                    output, is_error = f'调用异常：{e}', True
                runner.record('tool_result', output, extra={'is_error': is_error})
                return f'{"(失败) " if is_error else ""}{output}'

            tools.append(Tool.from_schema(
                function=_call,
                name=tool_name,
                description=f"[{server.name}] {item.get('description') or raw_name}",
                json_schema=schema))
    return tools


def _skill_hint():
    """技能只注入名称与用途，正文由模型按需通过 load_skill 拉取。"""
    from apps.ai.models import Skill
    skills = list(Skill.objects.filter(is_active=True))
    if not skills:
        return ''
    lines = ['', '可用技能（需要时用 load_skill 工具加载完整内容）：']
    lines.extend(f'- {x.name}：{x.description}' for x in skills)
    return '\n'.join(lines)


def build_agent(runner, instructions, with_ssh=True, with_tools=True):
    """组装智能体：系统提示 + 工具集。

    with_tools=False 用于「轮次耗尽后的总结调用」，此时不能再给任何工具，
    否则模型可能继续尝试执行命令。
    """
    model, _ = _build_model(runner.session)
    tools = []
    if with_tools:
        if with_ssh:
            tools.append(_make_ssh_tool(runner))
        tools.append(_make_skill_tool(runner))
        tools.extend(_make_mcp_tools(runner))
    return _PydanticAgent(
        model,
        deps_type=Deps,
        output_type=[str, DeferredToolRequests],
        instructions=instructions + _skill_hint(),
        tools=tools,
        model_settings=ModelSettings(parallel_tool_calls=True),
        retries=2,
    )


async def _drive(agent, runner, deps, prompt, history, deferred, max_loops):
    """驱动一次运行，把节点/事件翻译成记录与实时事件。

    返回 (run, stopped_by_verifier)。达到轮次上限时提前结束，
    由调用方决定是否追加一次总结。
    """
    stopped = False
    async with agent.iter(prompt, message_history=history, deps=deps,
                          deferred_tool_results=deferred) as run:
        async for node in run:
            if _PydanticAgent.is_model_request_node(node):
                runner.loop_no += 1
                if runner.loop_no > max_loops:
                    break
                started = False
                async with node.stream(run.ctx) as request_stream:
                    async for event in request_stream:
                        text = None
                        thinking = False
                        if isinstance(event, PartStartEvent):
                            text = getattr(getattr(event, 'part', None), 'content', None)
                            thinking = type(event.part).__name__.startswith('Thinking')
                        elif isinstance(event, PartDeltaEvent):
                            delta = event.delta
                            if isinstance(delta, (TextPartDelta, ThinkingPartDelta)):
                                text = getattr(delta, 'content_delta', None)
                                thinking = isinstance(delta, ThinkingPartDelta)
                        if not text:
                            continue
                        if not started:
                            started = True
                            runner.emit('delta_start', thinking=thinking)
                        runner.emit('delta', text=text, thinking=thinking)
                if started:
                    runner.emit('delta_end')

            elif _PydanticAgent.is_call_tools_node(node):
                executed = False
                async with node.stream(run.ctx) as handle_stream:
                    async for event in handle_stream:
                        if isinstance(event, FunctionToolCallEvent) \
                                and event.part.tool_name == 'ssh_exec':
                            executed = True
                # 修复模式：每批命令执行完立即复检，恢复了就不再继续消耗轮次
                if executed and runner.verifier:
                    is_ok, message = await asyncio.to_thread(runner.verifier)
                    # 写库必须放到线程里：Django 禁止在事件循环内访问数据库
                    await asyncio.to_thread(runner.record, 'verify', message, {'is_ok': is_ok})
                    runner._verified, runner._verify_msg = is_ok, message
                    if is_ok:
                        stopped = True
                        break
    return run, stopped


def _run_messages(run):
    """取出本次运行的完整消息历史。

    复检提前结束或轮次耗尽时会中途跳出迭代，此时 run.result 为 None，
    需要退回到运行上下文里已累积的消息。
    """
    if run.result is not None:
        return run.result.all_messages()
    try:
        return list(run.ctx.state.message_history)
    except Exception:
        return []


def _run_output(run):
    """取出模型的最终输出；运行被中途打断时返回 None。"""
    return run.result.output if run.result is not None else None


def _run_in_thread(coro_factory):
    """在当前线程内自建事件循环执行协程。

    调用方均为 Django 后台线程（无运行中的事件循环），因此可以安全地
    使用 asyncio.run；同步工具（paramiko、MCP 客户端）由框架放入线程池，
    不会阻塞循环，也因此得以并行。
    """
    return asyncio.run(coro_factory())


def _finish_deferred(runner, run, deferred_output):
    """本次运行因高危命令挂起：保存现场，置为待确认。"""
    session = runner.session
    approval = deferred_output.approvals[0]
    command = (approval.args_as_dict() or {}).get('command', '') \
        if hasattr(approval, 'args_as_dict') else ''
    reason = '高危命令，需要人工确认'
    runner.save_history(_run_messages(run))
    session.pending = json.dumps({
        'command': command,
        'reason': reason,
        'tool_call_id': approval.tool_call_id,
    }, ensure_ascii=False)
    session.status = 'waiting'
    session.save(update_fields=['pending', 'status'])
    runner.record('confirm', command, extra={'reason': reason})
    runner.emit('waiting', command=command, reason=reason)
    return session


def _settle_chat(runner, run, text):
    session = runner.session
    runner.save_history(_run_messages(run))
    if not text:
        # 轮次耗尽被打断：说明原因，而不是给用户一句空回复
        text = (f'已达到单次最大执行轮次（{runner.loop_no - 1}），'
                f'任务尚未结束。如需继续请再次提问。')
    runner.record('answer', text)
    session.status = 'idle'
    session.finished_at = human_datetime()
    session.save(update_fields=['status', 'finished_at'])
    runner.emit('done', status='idle', summary=None)
    return session


def _chat_instructions(session):
    from apps.ai.agent import AGENT_CHAT_PROMPT
    host = session.host
    return (f'{AGENT_CHAT_PROMPT}\n\n'
            f'当前服务器：{host.name}（{host.hostname}）')


def run_chat(session, question):
    """交互式会话：执行一次提问。"""
    from apps.ai.client import AIError
    runner = AgentRunner(session, emit=True, unattended=False)
    try:
        if session.mode == 'chat' or not session.host_id:
            return _plain_chat(runner, question)
        deps = Deps(session=session, runner=runner, mode='agent', unattended=False)
        max_loops = max(1, int(session.max_loops or 30))
        # 智能体构建与 SSH 建连都涉及 ORM，必须留在同步段：
        # Django 禁止在事件循环内直接访问数据库
        agent = build_agent(runner, _chat_instructions(session))
        history = runner.load_history()
        with session.host.get_ssh() as ssh:
            deps.ssh = ssh
            run, _ = _run_in_thread(
                lambda: _drive(agent, runner, deps, question, history, None, max_loops))
        output = _run_output(run)
        if isinstance(output, DeferredToolRequests):
            return _finish_deferred(runner, run, output)
        return _settle_chat(runner, run, output)
    except AIError as e:
        runner.record('error', str(e))
        return _abort_chat(runner, f'AI调用失败：{e}')
    except Exception as e:
        logging.exception('chat agent failed')
        runner.record('error', str(e))
        return _abort_chat(runner, f'执行异常：{e}')


def resume_chat(session, approved):
    """用户确认高危命令后原地续跑，不重放已执行过的命令。"""
    from apps.ai.client import AIError
    pending = json.loads(session.pending) if session.pending else None
    if not pending:
        return session
    runner = AgentRunner(session, emit=True, unattended=False)
    session.pending = None
    session.status = 'running'
    session.save(update_fields=['pending', 'status'])

    results = DeferredToolResults()
    results.approvals[pending['tool_call_id']] = True if approved \
        else ToolDenied('用户拒绝执行该高危命令，请改用其他方案或结束任务。')
    if not approved:
        runner.record('command', pending.get('command') or '',
                      extra={'rejected': '用户拒绝执行该高危命令'})

    try:
        deps = Deps(session=session, runner=runner, mode='agent', unattended=False)
        max_loops = max(1, int(session.max_loops or 30))
        agent = build_agent(runner, _chat_instructions(session))
        history = runner.load_history()
        with session.host.get_ssh() as ssh:
            deps.ssh = ssh
            run, _ = _run_in_thread(
                lambda: _drive(agent, runner, deps, None, history, results, max_loops))
        output = _run_output(run)
        if isinstance(output, DeferredToolRequests):
            return _finish_deferred(runner, run, output)
        return _settle_chat(runner, run, output)
    except AIError as e:
        runner.record('error', str(e))
        return _abort_chat(runner, f'AI调用失败：{e}')
    except Exception as e:
        logging.exception('resume failed')
        runner.record('error', str(e))
        return _abort_chat(runner, f'执行异常：{e}')


def _plain_chat(runner, question):
    """纯问答模式：不给任何可操作服务器的工具。"""
    from apps.ai.agent import CHAT_PROMPT
    session = runner.session
    agent = build_agent(runner, CHAT_PROMPT, with_ssh=False)
    deps = Deps(session=session, runner=runner, mode='chat')
    history = runner.load_history()
    run, _ = _run_in_thread(
        lambda: _drive(agent, runner, deps, question, history, None, 8))
    output = _run_output(run)
    if isinstance(output, DeferredToolRequests):
        return _finish_deferred(runner, run, output)
    return _settle_chat(runner, run, output)


def _abort_chat(runner, message):
    session = runner.session
    session.status = 'error'
    session.summary = message
    session.finished_at = human_datetime()
    session.save(update_fields=['status', 'summary', 'finished_at'])
    runner.emit('done', status='error', summary=message)
    return session


def _session_context(session):
    from apps.ai.models import AgentSession
    lines = [
        f'服务器：{session.host.name}（{session.host.hostname}）',
        f'告警对象：{session.target or "-"}',
        f'告警信息：{session.trigger_message or "-"}',
    ]
    if session.mode == 'repair':
        lines.append(f'最大修复轮次：{session.max_loops}（请尽量在更少轮次内恢复）')
    else:
        lines.append(f'最大排查轮次：{session.max_loops}（定位到原因后请立即结束，不必用满）')
    return '\n'.join(lines)


def _force_conclude(runner, agent, deps, run, max_loops):
    """轮次耗尽时追加一次总结调用，把已收集到的证据转成结论。

    不能直接丢弃前面几轮的排查过程，否则用户只会看到一句「已达上限」。
    """
    session = runner.session
    if session.mode == 'diagnose':
        ask = ('已达到最大排查轮次，请不要再调用任何工具。请基于已收集到的信息直接给出结论：'
               '已定位的原因或最可能的原因及判断依据；证据不足时说明还差哪些信息，'
               '并给出建议的修复步骤。')
    else:
        ask = ('已达到最大修复轮次，请不要再调用任何工具。请总结已执行的操作、当前状态、'
               '未能恢复的原因，以及仍需人工处理的事项。')
    try:
        summary_agent = build_agent(runner, ask, with_tools=False)
        history = _run_messages(run)
        conclude_run, _ = _run_in_thread(
            lambda: _drive(summary_agent, runner, deps, ask, history, None, 1))
        text = _run_output(conclude_run)
        if isinstance(text, str) and text.strip():
            return text.strip()[:2000]
    except Exception as e:
        logging.warning(f'force conclude failed: {e}')
        runner.record('error', f'生成最终结论失败：{e}')
    return None


def _finish_session(runner, summary, resolved, loop):
    session = runner.session
    if session.mode == 'diagnose':
        session.status = 'success' if summary else 'failed'
    elif resolved is True:
        session.status = 'success'
    elif resolved is False:
        session.status = 'failed'
    else:
        # 有复检器（告警触发）时以复检为准，模型自称修好不算数；
        # 无复检器（手动发起）时只能采信模型结论
        session.status = 'failed' if runner.verifier else 'success'
    if not summary:
        summary = (f'已达到最大排查轮次（{loop}），仍未定位到明确原因，请人工介入排查。'
                   if session.mode == 'diagnose'
                   else f'已达到最大修复轮次（{loop}），仍未确认故障恢复，已终止自动处理。')
    session.summary = summary
    session.used_loops = loop
    session.finished_at = human_datetime()
    session.save(update_fields=['status', 'summary', 'used_loops', 'finished_at'])
    runner.record('summary', summary)
    return session


def run_session(session, verifier=None):
    """监控告警触发的自动诊断 / 修复。

    无人值守：高危命令不挂起等待确认，直接跳过并要求模型改用安全方案；
    诊断模式额外禁止一切写操作。全过程仍写入 AgentRecord 便于事后排查。
    """
    from apps.ai.agent import DIAGNOSE_PROMPT, REPAIR_PROMPT
    from apps.ai.client import AIError
    runner = AgentRunner(session, verifier=verifier, emit=False, unattended=True)
    context = _session_context(session)
    runner.record('context', context, emit=False)
    instructions = DIAGNOSE_PROMPT if session.mode == 'diagnose' else REPAIR_PROMPT
    max_loops = max(1, int(session.max_loops or 15))
    deps = Deps(session=session, runner=runner, mode=session.mode, unattended=True)

    try:
        agent = build_agent(runner, instructions)
        with session.host.get_ssh() as ssh:
            deps.ssh = ssh
            run, stopped = _run_in_thread(
                lambda: _drive(agent, runner, deps,
                               f'{context}\n\n请开始处理。', None, None, max_loops))
        runner.save_history(_run_messages(run))
        loop = min(runner.loop_no, max_loops)

        if stopped and runner._verified:
            return _finish_session(
                runner, f'故障已恢复：{runner._verify_msg}', True, loop)

        output = _run_output(run)
        if isinstance(output, str) and output.strip():
            # 模型自行结束：修复模式若带复检器，仍以复检结果为准
            return _finish_session(runner, output.strip(), runner._verified, loop)

        summary = _force_conclude(runner, agent, deps, run, max_loops)
        return _finish_session(runner, summary, False, loop)
    except AIError as e:
        runner.record('error', str(e))
        return _abort_session(runner, f'AI调用失败：{e}')
    except Exception as e:
        logging.exception('agent run failed')
        runner.record('error', str(e))
        return _abort_session(runner, f'执行异常：{e}')


def _abort_session(runner, message):
    session = runner.session
    session.status = 'error'
    session.summary = message
    session.finished_at = human_datetime()
    session.save(update_fields=['status', 'summary', 'finished_at'])
    return session
