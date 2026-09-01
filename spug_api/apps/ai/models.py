# Copyright: (c) OpenSpug Organization. https://github.com/openspug/spug
# Copyright: (c) <spug.dev@gmail.com>
# Released under the AGPL-3.0 License.
from django.db import models
from libs import ModelMixin, human_datetime
from apps.account.models import User
import json


class AIModel(models.Model, ModelMixin):
    """OpenAI 协议兼容的模型配置。

    is_default 标记主模型，全局唯一；其余启用中的配置按 sort_id 顺序作为备选，
    主模型调用失败时自动降级。
    """
    name = models.CharField(max_length=64)
    base_url = models.CharField(max_length=255)
    api_key = models.TextField()
    model = models.CharField(max_length=100)
    timeout = models.IntegerField(default=600)
    temperature = models.FloatField(default=0.2)
    sort_id = models.IntegerField(default=0)
    is_default = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    desc = models.CharField(max_length=255, null=True)

    created_at = models.CharField(max_length=20, default=human_datetime)
    created_by = models.ForeignKey(User, models.PROTECT, related_name='+')
    updated_at = models.CharField(max_length=20, null=True)
    updated_by = models.ForeignKey(User, models.PROTECT, related_name='+', null=True)

    @property
    def endpoint(self):
        return f"{self.base_url.rstrip('/')}/chat/completions"

    def to_view(self):
        # api_key 按用户要求可回显，接口已限制为管理员权限
        return self.to_dict()

    def __repr__(self):
        return '<AIModel %r>' % self.name

    class Meta:
        db_table = 'ai_models'
        ordering = ('-is_default', '-sort_id', 'id')


class AgentSession(models.Model, ModelMixin):
    """智能体会话。

    每次 AI 诊断/修复都会创建一个会话，完整保留模型往返与命令执行记录，
    便于事后排查。监控告警触发的会话 source='monitor'。
    """
    SOURCES = (
        ('manual', '手动发起'),
        ('monitor', '监控告警'),
    )
    MODES = (
        ('chat', '问答'),
        ('diagnose', 'AI诊断'),
        ('repair', 'AI修复'),
    )
    STATUS = (
        ('idle', '空闲'),
        ('running', '执行中'),
        ('waiting', '等待确认'),
        ('success', '已完成'),
        ('failed', '未解决'),
        ('error', '执行异常'),
    )
    title = models.CharField(max_length=128)
    source = models.CharField(max_length=20, choices=SOURCES, default='manual')
    mode = models.CharField(max_length=20, choices=MODES)
    status = models.CharField(max_length=20, choices=STATUS, default='running')
    host = models.ForeignKey('host.Host', models.SET_NULL, null=True, related_name='+')
    detection_id = models.IntegerField(null=True)
    target = models.CharField(max_length=255, null=True)
    trigger_message = models.TextField(null=True)
    model_name = models.CharField(max_length=100, null=True)
    max_loops = models.IntegerField(default=3)
    used_loops = models.IntegerField(default=0)
    # 当前已进行的对话轮次，用于在记录中区分每一次用户提问
    turn = models.IntegerField(default=0)
    summary = models.TextField(null=True)
    # 高危命令等待用户确认时的断点现场（消息上下文、剩余命令等），JSON 文本
    pending = models.TextField(null=True)
    # 上下文压缩：历史对话超过阈值后压缩为摘要，从摘要处继续会话
    context_summary = models.TextField(null=True)
    # 摘要已覆盖的最后一条记录 id，此前的原始历史不再进入上下文
    summary_record_id = models.IntegerField(default=0)

    created_at = models.CharField(max_length=20, default=human_datetime)
    created_by = models.ForeignKey(User, models.PROTECT, related_name='+', null=True)
    finished_at = models.CharField(max_length=20, null=True)

    def to_view(self):
        tmp = self.to_dict()
        tmp['mode_alias'] = self.get_mode_display()
        tmp['status_alias'] = self.get_status_display()
        tmp['source_alias'] = self.get_source_display()
        tmp['host_name'] = self.host.name if self.host else None
        # 仅暴露待确认命令，避免把完整消息上下文回传给前端
        pending = json.loads(self.pending) if self.pending else None
        tmp['pending'] = {'command': pending['command'], 'reason': pending['reason']} \
            if pending else None
        return tmp

    def __repr__(self):
        return '<AgentSession %r>' % self.title

    class Meta:
        db_table = 'agent_sessions'
        ordering = ('-id',)


class AgentRecord(models.Model, ModelMixin):
    """会话内的单条执行记录，按时间顺序完整留存。"""
    KINDS = (
        ('context', '任务上下文'),
        ('question', '用户提问'),
        ('answer', 'AI回复'),
        ('thought', 'AI分析'),
        ('command', '执行命令'),
        ('confirm', '待确认命令'),
        ('output', '命令输出'),
        ('verify', '结果复检'),
        ('summary', '最终结论'),
        ('skill', '加载技能'),
        ('tool', 'MCP调用'),
        ('tool_result', 'MCP结果'),
        ('compress', '上下文压缩'),
        ('error', '异常'),
    )
    session = models.ForeignKey(AgentSession, models.CASCADE, related_name='records')
    turn = models.IntegerField(default=0)
    loop = models.IntegerField(default=0)
    kind = models.CharField(max_length=20, choices=KINDS)
    content = models.TextField()
    extra = models.TextField(null=True)
    created_at = models.CharField(max_length=20, default=human_datetime)

    def to_view(self):
        tmp = self.to_dict()
        tmp['kind_alias'] = self.get_kind_display()
        tmp['extra'] = json.loads(self.extra) if self.extra else None
        return tmp

    class Meta:
        db_table = 'agent_records'
        ordering = ('id',)


class McpServer(models.Model, ModelMixin):
    """MCP 服务配置，供智能体调用外部工具。

    仅支持两种部署形态：
    - docker：在本服务器上以 `docker run -i --rm 镜像` 启动，通过 stdio 通信；
    - http：Streamable HTTP 服务，直接通过 URL 通信。
    tools_cache 缓存 tools/list 的结果（连接测试时刷新），
    用于把工具清单注入智能体提示词，避免每轮会话都远程拉取。
    """
    TYPES = (
        ('docker', 'Docker'),
        ('http', 'HTTP'),
    )
    name = models.CharField(max_length=64)
    type = models.CharField(max_length=10, choices=TYPES)
    image = models.CharField(max_length=255, null=True)     # docker 镜像，如 mcp/fetch:latest
    command = models.CharField(max_length=255, null=True)   # docker 附加启动参数（可选）
    env = models.TextField(null=True)                       # docker 环境变量，JSON 对象
    url = models.CharField(max_length=255, null=True)       # http 服务地址
    headers = models.TextField(null=True)                   # http 附加请求头，JSON 对象
    timeout = models.IntegerField(default=60)
    tools_cache = models.TextField(null=True)               # tools/list 缓存，JSON 数组
    is_active = models.BooleanField(default=True)
    desc = models.CharField(max_length=255, null=True)

    created_at = models.CharField(max_length=20, default=human_datetime)
    created_by = models.ForeignKey(User, models.PROTECT, related_name='+')
    updated_at = models.CharField(max_length=20, null=True)
    updated_by = models.ForeignKey(User, models.PROTECT, related_name='+', null=True)

    def to_view(self):
        tmp = self.to_dict()
        tmp['type_alias'] = self.get_type_display()
        tmp['env'] = json.loads(self.env) if self.env else None
        tmp['headers'] = json.loads(self.headers) if self.headers else None
        tmp['tools'] = json.loads(self.tools_cache) if self.tools_cache else []
        tmp.pop('tools_cache', None)
        return tmp

    def __repr__(self):
        return '<McpServer %r>' % self.name

    class Meta:
        db_table = 'ai_mcp_servers'
        ordering = ('-id',)


class Skill(models.Model, ModelMixin):
    """技能（skill）：一段可复用的运维知识/操作手册。

    仅把名称与用途说明注入提示词，模型按需请求完整内容，
    避免技能正文过长撑爆上下文。
    """
    name = models.CharField(max_length=64)
    description = models.CharField(max_length=255)          # 用途说明，供模型判断何时使用
    content = models.TextField()                            # 技能正文（Markdown）
    is_active = models.BooleanField(default=True)

    created_at = models.CharField(max_length=20, default=human_datetime)
    created_by = models.ForeignKey(User, models.PROTECT, related_name='+')
    updated_at = models.CharField(max_length=20, null=True)
    updated_by = models.ForeignKey(User, models.PROTECT, related_name='+', null=True)

    def to_view(self):
        return self.to_dict()

    def __repr__(self):
        return '<Skill %r>' % self.name

    class Meta:
        db_table = 'ai_skills'
        ordering = ('-id',)
