import json
import re

from apps.ai.client import chat


MAX_TOTAL_OUTPUT_CHARS = 60000
SECRET_ASSIGNMENT_RE = re.compile(
    r'(?i)([A-Z0-9_]{0,64}(?:PASSWORD|PASSWD|TOKEN|SECRET|API_KEY|APIKEY|ACCESS_KEY)'
    r'[A-Z0-9_]{0,64}\s*[:=]\s*)([^\s,;"\']+)')
BEARER_RE = re.compile(r'(?i)(Authorization\s*:\s*Bearer\s+)([^\s,;]+)')
PRIVATE_KEY_RE = re.compile(
    r'-----BEGIN [^-]*PRIVATE KEY-----.*?-----END [^-]*PRIVATE KEY-----', re.DOTALL)


def redact_credentials(value):
    value = value or ''
    lowered = value.lower()
    if 'private key-----' in lowered:
        value = PRIVATE_KEY_RE.sub('[REDACTED PRIVATE KEY]', value)
    if any(keyword in lowered for keyword in (
            'password', 'passwd', 'token', 'secret', 'api_key', 'apikey', 'access_key')):
        value = SECRET_ASSIGNMENT_RE.sub(r'\1[REDACTED]', value)
    if 'authorization' in lowered and 'bearer' in lowered:
        value = BEARER_RE.sub(r'\1[REDACTED]', value)
    return value


def build_analysis_messages(task, outputs):
    rows = []
    output_limit = max(1000, MAX_TOTAL_OUTPUT_CHARS // max(len(outputs), 1))
    for target, value in outputs.items():
        if not value:
            continue
        code, duration, output = value
        rows.append({
            'target': str(target),
            'exit_code': code,
            'duration_seconds': duration,
            'output': redact_credentials(output)[:output_limit],
        })
    payload = {
        'task_name': task.name,
        'task_type': task.type,
        'script': redact_credentials(task.command)[:10000],
        'results': rows,
    }
    return [
        {
            'role': 'system',
            'content': (
                '你是运维任务结果分析助手。请根据脚本、退出码和输出给出简洁、可执行的中文结论。'
                '必须说明总体状态、关键异常、可能原因和建议；不要编造输出中不存在的事实。'
            ),
        },
        {
            'role': 'user',
            'content': '请分析以下任务执行结果：\n' + json.dumps(payload, ensure_ascii=False),
        },
    ]


def analyze_history(task, outputs):
    try:
        summary, model_name = chat(build_analysis_messages(task, outputs), temperature=0.1)
        return {'status': 'success', 'summary': summary, 'model': model_name}
    except Exception as exc:
        return {'status': 'error', 'summary': f'AI 分析失败：{exc}', 'model': ''}
