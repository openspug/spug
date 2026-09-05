# Copyright: (c) OpenSpug Organization. https://github.com/openspug/spug
# Copyright: (c) <spug.dev@gmail.com>
# Released under the AGPL-3.0 License.
from django.views.generic import View
from django.db import transaction, close_old_connections
from django.http import StreamingHttpResponse
from libs import json_response, JsonParser, Argument, human_datetime, auth
from apps.ai.models import AIModel, AgentSession, AgentRecord, McpServer, Skill
from apps.ai.client import chat, AIError
from apps.ai.agent import run_session, run_chat, resume_chat
from apps.ai import stream as ai_stream
from apps.ai import mcp as mcp_client
from apps.host.models import Host
from threading import Thread
import logging
import json


class ModelView(View):
    @auth('config.model.view')
    def get(self, request):
        return json_response([x.to_view() for x in AIModel.objects.all()])

    @auth('config.model.add|config.model.edit')
    def post(self, request):
        form, error = JsonParser(
            Argument('id', type=int, required=False),
            Argument('name', help='请输入模型配置名称'),
            Argument('base_url', handler=str.strip, help='请输入接口地址'),
            Argument('api_key', handler=str.strip, help='请输入API Key'),
            Argument('model', handler=str.strip, help='请输入模型名称'),
            Argument('timeout', type=int, default=600),
            Argument('temperature', type=float, default=0.2),
            Argument('sort_id', type=int, default=0),
            Argument('is_default', type=bool, default=False),
            Argument('is_active', type=bool, default=True),
            Argument('desc', required=False),
        ).parse(request.body)
        if error is None:
            other = AIModel.objects.filter(name=form.name).first()
            if other and (not form.id or other.id != form.id):
                return json_response(error=f'已存在的模型配置名称【{form.name}】')
            with transaction.atomic():
                if form.is_default:
                    # 主模型全局唯一，其余自动转为备选
                    AIModel.objects.exclude(pk=form.id or 0).update(is_default=False)
                if form.id:
                    AIModel.objects.filter(pk=form.id).update(
                        updated_at=human_datetime(), updated_by=request.user, **form)
                else:
                    if not AIModel.objects.exists():
                        form.is_default = True  # 第一个配置默认作为主模型
                    AIModel.objects.create(created_by=request.user, **form)
        return json_response(error=error)

    @auth('config.model.edit')
    def patch(self, request):
        form, error = JsonParser(
            Argument('id', type=int, help='参数错误'),
            Argument('is_active', type=bool, required=False),
            Argument('is_default', type=bool, required=False),
        ).parse(request.body, True)
        if error is None:
            with transaction.atomic():
                if form.get('is_default'):
                    AIModel.objects.exclude(pk=form.id).update(is_default=False)
                AIModel.objects.filter(pk=form.id).update(**form)
        return json_response(error=error)

    @auth('config.model.del')
    def delete(self, request):
        form, error = JsonParser(
            Argument('id', type=int, help='请指定操作对象')
        ).parse(request.GET)
        if error is None:
            AIModel.objects.filter(pk=form.id).delete()
        return json_response(error=error)


@auth('config.model.add|config.model.edit')
def test_model(request):
    """连通性测试：未传 id 时用表单里的临时配置直接试调。"""
    form, error = JsonParser(
        Argument('id', type=int, required=False),
        Argument('base_url', required=False),
        Argument('api_key', required=False),
        Argument('model', required=False),
        Argument('timeout', type=int, required=False),
    ).parse(request.body)
    if error is not None:
        return json_response(error=error)
    if form.id:
        item = AIModel.objects.filter(pk=form.id).first()
        if not item:
            return json_response(error='未找到指定模型配置')
    else:
        if not all([form.base_url, form.api_key, form.model]):
            return json_response(error='请先填写接口地址、API Key 和模型名称')
        item = AIModel(
            name='temp', base_url=form.base_url, api_key=form.api_key,
            model=form.model, timeout=form.timeout or 600)
    try:
        content, name = chat(
            [{'role': 'user', 'content': '请只回复两个字：正常'}], models=[item])
    except AIError as e:
        return json_response(error=str(e))
    return json_response({'content': content[:200], 'model': name})


class McpView(View):
    @auth('ai.mcp.view')
    def get(self, request):
        return json_response([x.to_view() for x in McpServer.objects.all()])

    @auth('ai.mcp.add|ai.mcp.edit')
    def post(self, request):
        form, error = JsonParser(
            Argument('id', type=int, required=False),
            Argument('name', handler=str.strip, help='请输入服务名称'),
            Argument('type', filter=lambda x: x in ('docker', 'http'), help='请选择部署类型'),
            Argument('image', handler=str.strip, required=False),
            Argument('command', handler=str.strip, required=False),
            Argument('env', type=dict, required=False),
            Argument('url', handler=str.strip, required=False),
            Argument('headers', type=dict, required=False),
            Argument('timeout', type=int, default=60),
            Argument('is_active', type=bool, default=True),
            Argument('desc', required=False),
        ).parse(request.body)
        if error is None:
            if form.type == 'docker' and not form.image:
                return json_response(error='Docker 类型需要填写镜像名称')
            if form.type == 'http' and not form.url:
                return json_response(error='HTTP 类型需要填写服务地址')
            other = McpServer.objects.filter(name=form.name).first()
            if other and (not form.id or other.id != form.id):
                return json_response(error=f'已存在的MCP服务名称【{form.name}】')
            form.env = json.dumps(form.env, ensure_ascii=False) if form.env else None
            form.headers = json.dumps(form.headers, ensure_ascii=False) if form.headers else None
            if form.id:
                McpServer.objects.filter(pk=form.id).update(
                    updated_at=human_datetime(), updated_by=request.user, **form)
            else:
                McpServer.objects.create(created_by=request.user, **form)
        return json_response(error=error)

    @auth('ai.mcp.edit')
    def patch(self, request):
        form, error = JsonParser(
            Argument('id', type=int, help='参数错误'),
            Argument('is_active', type=bool, required=False),
        ).parse(request.body, True)
        if error is None:
            McpServer.objects.filter(pk=form.id).update(**form)
        return json_response(error=error)

    @auth('ai.mcp.del')
    def delete(self, request):
        form, error = JsonParser(
            Argument('id', type=int, help='请指定操作对象')
        ).parse(request.GET)
        if error is None:
            McpServer.objects.filter(pk=form.id).delete()
        return json_response(error=error)


@auth('ai.mcp.add|ai.mcp.edit')
def test_mcp(request):
    """连接测试：拉取工具清单。已保存的配置（传 id）测试成功后刷新工具缓存。"""
    form, error = JsonParser(
        Argument('id', type=int, required=False),
        Argument('type', required=False, filter=lambda x: x in ('docker', 'http')),
        Argument('image', handler=str.strip, required=False),
        Argument('command', handler=str.strip, required=False),
        Argument('env', type=dict, required=False),
        Argument('url', handler=str.strip, required=False),
        Argument('headers', type=dict, required=False),
        Argument('timeout', type=int, required=False),
    ).parse(request.body)
    if error is not None:
        return json_response(error=error)
    if form.id:
        item = McpServer.objects.filter(pk=form.id).first()
        if not item:
            return json_response(error='未找到指定MCP服务')
        # 允许用表单里未保存的修改直接测试
        for key in ('type', 'image', 'command', 'url', 'timeout'):
            if form.get(key):
                setattr(item, key, form.get(key))
        if form.get('env') is not None:
            item.env = json.dumps(form.env, ensure_ascii=False)
        if form.get('headers') is not None:
            item.headers = json.dumps(form.headers, ensure_ascii=False)
    else:
        if not form.type:
            return json_response(error='请选择部署类型')
        if form.type == 'docker' and not form.image:
            return json_response(error='Docker 类型需要填写镜像名称')
        if form.type == 'http' and not form.url:
            return json_response(error='HTTP 类型需要填写服务地址')
        item = McpServer(
            name='temp', type=form.type, image=form.image, command=form.command,
            env=json.dumps(form.env, ensure_ascii=False) if form.env else None,
            url=form.url,
            headers=json.dumps(form.headers, ensure_ascii=False) if form.headers else None,
            timeout=form.timeout or 60)
    try:
        tools = mcp_client.test_server(item)
    except mcp_client.McpError as e:
        return json_response(error=str(e))
    if form.id:
        McpServer.objects.filter(pk=form.id).update(
            tools_cache=json.dumps(tools, ensure_ascii=False))
    return json_response({'tools': tools})


class SkillView(View):
    @auth('ai.skill.view')
    def get(self, request):
        return json_response([x.to_view() for x in Skill.objects.all()])

    @auth('ai.skill.add|ai.skill.edit')
    def post(self, request):
        form, error = JsonParser(
            Argument('id', type=int, required=False),
            Argument('name', handler=str.strip, help='请输入技能名称'),
            Argument('description', handler=str.strip, help='请输入用途说明'),
            Argument('content', help='请输入技能内容'),
            Argument('is_active', type=bool, default=True),
        ).parse(request.body)
        if error is None:
            other = Skill.objects.filter(name=form.name).first()
            if other and (not form.id or other.id != form.id):
                return json_response(error=f'已存在的技能名称【{form.name}】')
            if form.id:
                Skill.objects.filter(pk=form.id).update(
                    updated_at=human_datetime(), updated_by=request.user, **form)
            else:
                Skill.objects.create(created_by=request.user, **form)
        return json_response(error=error)

    @auth('ai.skill.edit')
    def patch(self, request):
        form, error = JsonParser(
            Argument('id', type=int, help='参数错误'),
            Argument('is_active', type=bool, required=False),
        ).parse(request.body, True)
        if error is None:
            Skill.objects.filter(pk=form.id).update(**form)
        return json_response(error=error)

    @auth('ai.skill.del')
    def delete(self, request):
        form, error = JsonParser(
            Argument('id', type=int, help='请指定操作对象')
        ).parse(request.GET)
        if error is None:
            Skill.objects.filter(pk=form.id).delete()
        return json_response(error=error)


class SessionView(View):
    @auth('ai.agent.view')
    def get(self, request):
        form, error = JsonParser(
            Argument('id', type=int, required=False),
        ).parse(request.GET)
        if error is not None:
            return json_response(error=error)
        if form.id:
            session = AgentSession.objects.filter(pk=form.id).first()
            if not session:
                return json_response(error='未找到指定会话')
            data = session.to_view()
            data['records'] = [x.to_view() for x in session.records.all()]
            return json_response(data)
        return json_response([x.to_view() for x in AgentSession.objects.all()[:500]])

    @auth('ai.agent.do')
    def post(self, request):
        """新建对话会话。对话内容通过 /api/ai/session/chat/ 发送。"""
        form, error = JsonParser(
            Argument('title', required=False),
            Argument('mode', default='chat',
                     filter=lambda x: x in ('chat', 'diagnose', 'repair'), help='请选择正确的会话模式'),
            Argument('host_id', type=int, required=False),
            Argument('max_loops', type=int, default=30),
            Argument('trigger_message', required=False),
        ).parse(request.body)
        if error is not None:
            return json_response(error=error)

        host = None
        if form.host_id:
            host = Host.objects.filter(pk=form.host_id).first()
            if not host:
                return json_response(error='未找到指定主机')
        if form.mode in ('diagnose', 'repair') and not host:
            return json_response(error='该模式需要选择目标主机')

        session = AgentSession.objects.create(
            title=form.title or '新对话',
            source='manual',
            mode=form.mode,
            status='idle',
            host=host,
            target=f'{host.name}({host.hostname})' if host else None,
            trigger_message=form.trigger_message,
            max_loops=max(1, min(form.max_loops or 5, 20)),
            created_by=request.user)

        # 告警式的一次性诊断/修复仍按原有引擎后台执行
        if form.mode in ('diagnose', 'repair') and form.trigger_message:
            session.status = 'running'
            session.save(update_fields=['status'])
            transaction.on_commit(lambda: Thread(target=run_session, args=(session,)).start())
        return json_response(session.to_view())

    @auth('ai.agent.do')
    def patch(self, request):
        form, error = JsonParser(
            Argument('id', type=int, help='参数错误'),
            Argument('title', required=False),
            Argument('host_id', type=int, required=False),
            Argument('mode', required=False,
                     filter=lambda x: x in ('chat', 'agent'), help='请选择正确的会话模式'),
        ).parse(request.body, True)
        if error is not None:
            return json_response(error=error)
        session = AgentSession.objects.filter(pk=form.id).first()
        if not session:
            return json_response(error='未找到指定会话')
        if form.get('title'):
            session.title = form.title
        if 'host_id' in form:
            if form.host_id:
                host = Host.objects.filter(pk=form.host_id).first()
                if not host:
                    return json_response(error='未找到指定主机')
                session.host = host
                session.target = f'{host.name}({host.hostname})'
            else:
                session.host = None
                session.target = None
        if form.get('mode'):
            # 前端的 agent 模式在库中仍以 repair 存储，复用同一套命令安全策略
            session.mode = 'chat' if form.mode == 'chat' else 'repair'
        session.save()
        return json_response(session.to_view())

    @auth('ai.agent.del')
    def delete(self, request):
        form, error = JsonParser(
            Argument('id', type=int, help='请指定操作对象')
        ).parse(request.GET)
        if error is None:
            AgentSession.objects.filter(pk=form.id).delete()
        return json_response(error=error)


@auth('ai.agent.do')
def session_chat(request):
    """在指定会话中发送一条消息。

    模型调用可能长达数百秒，而 Django 开启了 ATOMIC_REQUESTS（整个请求处于
    一个事务中），长时间占用会导致连接被 MySQL 断开。因此这里只负责落库用户
    提问并立即返回，真正的模型调用放到后台线程执行，前端通过轮询会话详情
    获取回复。
    """
    form, error = JsonParser(
        Argument('id', type=int, help='参数错误'),
        Argument('question', handler=str.strip, help='请输入内容'),
        Argument('host_id', type=int, required=False),
        Argument('mode', required=False, filter=lambda x: x in ('chat', 'agent'),
                 help='请选择正确的会话模式'),
    ).parse(request.body)
    if error is not None:
        return json_response(error=error)

    session = AgentSession.objects.filter(pk=form.id).first()
    if not session:
        return json_response(error='未找到指定会话')
    if session.status == 'running':
        return json_response(error='当前会话正在处理中，请稍候')

    # 允许在对话过程中随时切换模式与目标服务器
    if form.get('mode'):
        session.mode = 'chat' if form.mode == 'chat' else 'repair'
    if 'host_id' in form:
        if form.host_id:
            host = Host.objects.filter(pk=form.host_id).first()
            if not host:
                return json_response(error='未找到指定主机')
            session.host = host
            session.target = f'{host.name}({host.hostname})'
        else:
            session.host = None
            session.target = None
    if session.mode != 'chat' and not session.host_id:
        return json_response(error='Agent 模式需要先选择服务器')
    if session.title == '新对话':
        session.title = form.question[:30]

    # 提问先入库，保证前端轮询时能立刻看到自己的消息
    session.turn += 1
    session.status = 'running'
    session.save()
    AgentRecord.objects.create(
        session=session, turn=session.turn, kind='question', content=form.question)

    # 清空上一轮的事件回放队列，避免 SSE 建连时把旧的 done/waiting 事件
    # 重播给前端，导致前端误判本轮已结束而提前断流（表现为第二轮“卡住”）
    ai_stream.reset(session.id)
    # ATOMIC_REQUESTS 开启时必须等事务提交后再启动后台线程，
    # 否则线程可能读不到刚落库的提问记录，或状态被事务提交覆盖回 running
    transaction.on_commit(
        lambda: Thread(target=run_chat, args=(session.id, form.question)).start())
    return json_response(session.to_view())


@auth('ai.agent.do')
def session_confirm(request):
    """确认或拒绝执行高危命令，随后从断点继续。"""
    form, error = JsonParser(
        Argument('id', type=int, help='参数错误'),
        Argument('approve', type=bool, help='参数错误'),
    ).parse(request.body)
    if error is not None:
        return json_response(error=error)
    session = AgentSession.objects.filter(pk=form.id).first()
    if not session:
        return json_response(error='未找到指定会话')
    if session.status != 'waiting' or not session.pending:
        return json_response(error='当前会话没有待确认的命令')

    session.status = 'running'
    session.save(update_fields=['status'])
    # 同上：清掉本轮已回放过的事件（含 waiting/confirm），避免确认后重播导致确认框复现
    ai_stream.reset(session.id)
    transaction.on_commit(
        lambda: Thread(target=resume_chat, args=(session.id, form.approve)).start())
    return json_response(session.to_view())


@auth('ai.agent.view')
def session_stream(request):
    """SSE：实时推送模型增量输出与命令执行过程。"""
    session_id = request.GET.get('id')
    if not session_id:
        return json_response(error='参数错误')
    session = AgentSession.objects.filter(pk=session_id).first()
    if not session:
        return json_response(error='未找到指定会话')
    offset = int(request.GET.get('offset') or 0)

    def pack(event):
        return f'data: {json.dumps(event, ensure_ascii=False)}\n\n'

    def produce():
        pubsub = None
        try:
            # 先订阅再判状态，避免「补播 → 判状态」之间产生的事件丢失；
            # 也支持前端先建连、后发消息的用法。
            pubsub = ai_stream.subscribe(session_id)
            for item in ai_stream.backlog(session_id, offset):
                yield pack(item)
            close_old_connections()
            status = AgentSession.objects.filter(pk=session_id).values_list('status', flat=True).first()
            # 已结束的会话直接收尾；waiting 表示挂起等待用户确认，同样不需要继续等
            if status in ('idle', 'success', 'failed', 'error', 'waiting'):
                # 给刚提交的请求留一点窗口，避免「先建连后发消息」被误判为已结束
                grace = int(request.GET.get('grace') or 0)
                waited = 0
                while grace and waited < grace:
                    message = pubsub.get_message(timeout=1)
                    if message and message.get('type') == 'message':
                        raw = message['data']
                        if isinstance(raw, bytes):
                            raw = raw.decode('utf-8', 'ignore')
                        yield f'data: {raw}\n\n'
                        break
                    waited += 1
                    yield ': keep-alive\n\n'
                else:
                    yield pack({'type': 'done', 'status': status})
                    return
            idle = 0
            while True:
                message = pubsub.get_message(timeout=1)
                if message and message.get('type') == 'message':
                    idle = 0
                    raw = message['data']
                    if isinstance(raw, bytes):
                        raw = raw.decode('utf-8', 'ignore')
                    yield f'data: {raw}\n\n'
                    try:
                        if json.loads(raw).get('type') == 'done':
                            return
                    except (ValueError, TypeError):
                        pass
                else:
                    idle += 1
                    yield ': keep-alive\n\n'   # 心跳，避免中间层断开空闲连接
                    if idle % 5 == 0:
                        # 兜底：进程异常退出时不会有 done 事件，靠状态轮询收尾
                        close_old_connections()
                        status = AgentSession.objects.filter(pk=session_id) \
                            .values_list('status', flat=True).first()
                        if status != 'running':
                            yield pack({'type': 'done', 'status': status})
                            return
                    if idle > 1800:
                        return
        except GeneratorExit:
            raise
        except Exception as e:
            logging.warning(f'sse stream error: {e}')
            yield pack({'type': 'error', 'message': str(e)})
        finally:
            if pubsub:
                try:
                    pubsub.close()
                except Exception:
                    pass
            close_old_connections()

    response = StreamingHttpResponse(produce(), content_type='text/event-stream')
    response['Cache-Control'] = 'no-cache'
    response['X-Accel-Buffering'] = 'no'   # 关闭 nginx 缓冲，保证逐条下发
    return response
