# Copyright: (c) OpenSpug Organization. https://github.com/openspug/spug
# Copyright: (c) <spug.dev@gmail.com>
# Released under the AGPL-3.0 License.
import django
from django.core.cache import cache
from django.conf import settings
from libs import JsonParser, Argument, json_response, auth
from libs.utils import generate_random_str
from libs.mail import Mail
from libs.push import get_balance, send_login_code
from libs.mixins import AdminView
from apps.setting.utils import AppSetting
from apps.setting.models import Setting, KEYS_DEFAULT
from copy import deepcopy
import platform
import ldap
from django.http import StreamingHttpResponse
from openai import OpenAI
import json


class SettingView(AdminView):
    def get(self, request):
        response = deepcopy(KEYS_DEFAULT)
        for item in Setting.objects.all():
            if item.key == 'spug_push_key':
                response[item.key] = f'{item.real_val[:8]}********{item.real_val[-8:]}'
            else:
                response[item.key] = item.real_val
        return json_response(response)

    def post(self, request):
        form, error = JsonParser(
            Argument('data', type=list, help='缺少必要的参数')
        ).parse(request.body)
        if error is None:
            for item in form.data:
                AppSetting.set(**item)
        return json_response(error=error)


class MFAView(AdminView):
    def get(self, request):
        if not request.user.wx_token:
            return json_response(
                error='检测到当前账户未配置推送标识（账户管理/编辑），请配置后再尝试启用MFA认证，否则可能造成系统无法正常登录。')
        spug_push_key = AppSetting.get_default('spug_push_key')
        if not spug_push_key:
            return json_response(error='检测到当前账户未绑定推送服务，请在系统设置/推送服务设置中绑定推送助手账户。')
        code = generate_random_str(6)
        send_login_code(spug_push_key, request.user.wx_token, code)
        cache.set(f'{request.user.username}:code', code, 300)
        return json_response()

    def post(self, request):
        form, error = JsonParser(
            Argument('enable', type=bool, help='参数错误'),
            Argument('code', required=False)
        ).parse(request.body)
        if error is None:
            if form.enable:
                if not form.code:
                    return json_response(error='请输入验证码')
                key = f'{request.user.username}:code'
                code = cache.get(key)
                if not code:
                    return json_response(error='验证码已失效，请重新获取')
                if code != form.code:
                    ttl = cache.ttl(key)
                    cache.expire(key, ttl - 100)
                    return json_response(error='验证码错误')
                cache.delete(key)
            AppSetting.set('MFA', {'enable': form.enable})
        return json_response(error=error)


@auth('admin')
def ldap_test(request):
    form, error = JsonParser(
        Argument('server'),
        Argument('port', type=int),
        Argument('admin_dn'),
        Argument('password'),
    ).parse(request.body)
    if error is None:
        try:
            con = ldap.initialize("ldap://{0}:{1}".format(form.server, form.port), bytes_mode=False)
            con.simple_bind_s(form.admin_dn, form.password)
            return json_response()
        except Exception as e:
            error = eval(str(e))
            return json_response(error=error['desc'])
    return json_response(error=error)


@auth('admin')
def email_test(request):
    form, error = JsonParser(
        Argument('server', help='请输入邮件服务地址'),
        Argument('port', type=int, help='请输入邮件服务端口号'),
        Argument('username', help='请输入邮箱账号'),
        Argument('password', help='请输入密码/授权码'),
    ).parse(request.body)
    if error is None:
        try:
            mail = Mail(**form)
            server = mail.get_server()
            server.quit()
            return json_response()
        except Exception as e:
            error = f'{e}'
    return json_response(error=error)


@auth('admin')
def get_about(request):
    return json_response({
        'python_version': platform.python_version(),
        'system_version': platform.platform(),
        'spug_version': settings.SPUG_VERSION,
        'django_version': django.get_version()
    })


@auth('admin')
def handle_push_bind(request):
    form, error = JsonParser(
        Argument('spug_push_key', required=False),
    ).parse(request.body)
    if error is None:
        if not form.spug_push_key:
            AppSetting.delete('spug_push_key')
            return json_response()

        try:
            res = get_balance(form.spug_push_key)
        except Exception as e:
            return json_response(error=f'绑定失败：{e}')

        AppSetting.set('spug_push_key', form.spug_push_key)
        return json_response(res)
    return json_response(error=error)


@auth('admin')
def handle_push_balance(request):
    token = AppSetting.get_default('spug_push_key')
    if not token:
        return json_response(error='请先配置推送服务绑定账户')
    res = get_balance(token)
    return json_response(res)


@auth('admin')
def ai_assistant(request):
    """
    使用 DashScope 接入大模型，通过 openai 库流式返回生成结果，支持上下文对话
    """
    print(request.body)
    try:
        # 解析请求
        form = json.loads(request.body)
        question = form.get('question')
        context = form.get('context', [])
        if not question:
            return JsonResponse({"error": "请输入问题"}, status=400)
    except Exception as e:
        return JsonResponse({"error": f"请求解析失败：{e}"}, status=400)

    api_key = "sk-d4f98b80a3064eed843aa670eee486b4"
    if not api_key:
        return JsonResponse({"error": "未配置 DashScope API Key，请在系统设置中配置。"}, status=400)

    try:
        # 初始化 OpenAI 客户端
        client = OpenAI(
            api_key=api_key,
            base_url="https://dashscope.aliyuncs.com/compatible-mode/v1"
        )

        # 构建消息列表
        messages = context + [
            {"role": "user", "content": question}
        ]

        # 调用 DashScope API
        completion = client.chat.completions.create(
            model="qwen-plus",
            messages=messages,
            stream=True,
            stream_options={"include_usage": True}
        )

        # 流式返回
        def stream_response():
            try:
                for chunk in completion:
                    # 参考阿里云代码，跳过 usage chunk
                    if chunk.choices:
                        delta_content = chunk.choices[0].delta.content
                        if delta_content:  # 确保内容非空
                            yield delta_content
                    # else: usage chunk，忽略
            except Exception as e:
                yield json.dumps({"error": f"流式响应错误：{str(e)}"})
            finally:
                completion.close()  # 释放资源

        return StreamingHttpResponse(
            stream_response(),
            content_type="text/plain; charset=utf-8"
        )
    except Exception as e:
        return JsonResponse({"error": f"调用 DashScope API 失败：{e}"}, status=500)