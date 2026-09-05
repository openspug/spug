# Copyright: (c) OpenSpug Organization. https://github.com/openspug/spug
# Copyright: (c) <spug.dev@gmail.com>
# Released under the AGPL-3.0 License.
"""OpenAI 协议兼容的模型调用客户端。

按「主模型优先、备选依次降级」的顺序调用：主模型（is_default）排在最前，
其余启用中的配置按 sort_id 排序作为备选。任一模型调用异常（网络错误、
非 200、响应结构异常）都会自动切换到下一个，全部失败时抛出 AIError。
"""
from apps.ai.models import AIModel
import requests
import logging
import json


class AIError(Exception):
    pass


def get_usable_models():
    return list(AIModel.objects.filter(is_active=True))


def _do_request(item, messages, temperature=None):
    headers = {
        'Authorization': f'Bearer {item.api_key}',
        'Content-Type': 'application/json',
    }
    payload = {
        'model': item.model,
        'messages': messages,
        'temperature': item.temperature if temperature is None else temperature,
        'stream': False,
    }
    res = requests.post(item.endpoint, headers=headers, json=payload, timeout=item.timeout or 600)
    if res.status_code != 200:
        raise AIError(f'HTTP {res.status_code}: {res.text[:200]}')
    try:
        data = res.json()
        content = data['choices'][0]['message']['content']
    except Exception as e:
        raise AIError(f'响应解析失败: {e}, 原始内容: {res.text[:200]}')
    if not content:
        raise AIError('模型返回内容为空')
    return content


def _do_stream_request(item, messages, temperature=None, on_delta=None):
    """按 OpenAI SSE 协议流式读取，边收边通过 on_delta 回调增量文本。"""
    headers = {
        'Authorization': f'Bearer {item.api_key}',
        'Content-Type': 'application/json',
        'Accept': 'text/event-stream',
    }
    payload = {
        'model': item.model,
        'messages': messages,
        'temperature': item.temperature if temperature is None else temperature,
        'stream': True,
    }
    parts = []
    with requests.post(item.endpoint, headers=headers, json=payload,
                       timeout=item.timeout or 600, stream=True) as res:
        if res.status_code != 200:
            raise AIError(f'HTTP {res.status_code}: {res.text[:200]}')
        # 服务端未声明 charset 时 requests 会退回 latin-1，导致中文乱码，
        # SSE 规范固定使用 UTF-8，这里显式指定
        res.encoding = 'utf-8'
        for line in res.iter_lines(decode_unicode=True):
            if not line:
                continue
            if line.startswith('data:'):
                line = line[5:].strip()
            if not line or line == '[DONE]':
                continue
            try:
                chunk = json.loads(line)
                delta = chunk['choices'][0].get('delta') or {}
                text = delta.get('content')
            except Exception:
                continue
            if text:
                parts.append(text)
                if on_delta:
                    on_delta(text)
    content = ''.join(parts)
    if not content:
        raise AIError('模型返回内容为空')
    return content


def chat(messages, temperature=None, models=None, on_delta=None):
    """调用模型，返回 (内容, 实际使用的模型名)。全部失败时抛 AIError。

    传入 on_delta 时走流式协议，边接收边回调增量文本；降级到下一个模型前
    会先发出一次重置信号，避免把上一个模型的半截输出与新内容拼接在一起。
    """
    items = models if models is not None else get_usable_models()
    if not items:
        raise AIError('未配置可用的AI模型，请在配置中心/模型配置中添加并启用')
    errors = []
    for item in items:
        try:
            if on_delta:
                content = _do_stream_request(item, messages, temperature, on_delta)
            else:
                content = _do_request(item, messages, temperature)
            return content, item.name
        except Exception as e:
            logging.warning(f'AI model {item.name} failed: {e}')
            errors.append(f'{item.name}: {e}')
            if on_delta:
                on_delta(None)  # None 表示丢弃已输出的片段，准备重试下一个模型
    raise AIError('所有模型调用失败 -> ' + ' | '.join(errors))


def extract_json(text):
    """从模型回复中提取 JSON 对象，兼容 ```json 代码块包裹的情况。"""
    if not text:
        return None
    content = text.strip()
    if content.startswith('```'):
        content = content.split('\n', 1)[-1]
        if content.endswith('```'):
            content = content[:-3]
        elif '```' in content:
            content = content.rsplit('```', 1)[0]
    content = content.strip()
    start, end = content.find('{'), content.rfind('}')
    if start == -1 or end <= start:
        return None
    try:
        return json.loads(content[start:end + 1])
    except json.JSONDecodeError:
        return None
