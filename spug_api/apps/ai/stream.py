# Copyright: (c) OpenSpug Organization. https://github.com/openspug/spug
# Copyright: (c) <spug.dev@gmail.com>
# Released under the AGPL-3.0 License.
"""智能体会话的实时事件总线。

后台线程把模型增量、命令执行等事件写入 Redis，SSE 接口订阅后推送到浏览器。
同时保留一份有限长度的事件回放列表，保证前端在建立 SSE 之前产生的事件
不会丢失（例如刚发出提问、连接尚未建立的那一小段时间）。
"""
from django_redis import get_redis_connection
import json

CHANNEL = 'spug:ai:stream:{}'
BACKLOG = 'spug:ai:backlog:{}'
BACKLOG_MAX = 500
BACKLOG_TTL = 3600


def publish(session_id, event):
    """发布一个事件；event 为可 JSON 序列化的 dict。"""
    rds = get_redis_connection()
    raw = json.dumps(event, ensure_ascii=False)
    key = BACKLOG.format(session_id)
    pipe = rds.pipeline()
    pipe.rpush(key, raw)
    pipe.ltrim(key, -BACKLOG_MAX, -1)
    pipe.expire(key, BACKLOG_TTL)
    pipe.publish(CHANNEL.format(session_id), raw)
    pipe.execute()


def reset(session_id):
    get_redis_connection().delete(BACKLOG.format(session_id))


def backlog(session_id, offset=0):
    """取回已产生的事件，用于 SSE 建连后的补播。"""
    items = get_redis_connection().lrange(BACKLOG.format(session_id), offset, -1)
    result = []
    for item in items:
        try:
            result.append(json.loads(item))
        except (ValueError, TypeError):
            continue
    return result


def subscribe(session_id):
    """返回 (pubsub, 频道名)，调用方负责关闭。"""
    rds = get_redis_connection()
    pubsub = rds.pubsub(ignore_subscribe_messages=True)
    pubsub.subscribe(CHANNEL.format(session_id))
    return pubsub
