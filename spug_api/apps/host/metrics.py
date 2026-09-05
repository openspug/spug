# Copyright: (c) OpenSpug Organization. https://github.com/openspug/spug
# Copyright: (c) <spug.dev@gmail.com>
# Released under the AGPL-3.0 License.
"""主机实时指标探针。

通过已有 SSH 通道执行一条只读命令采集 CPU / GPU / 内存 / 磁盘指标，
不向目标主机写入任何文件、不安装任何 agent、不产生常驻进程。

CPU 使用率依赖两次 /proc/stat 采样的差值。为把对被探测主机的影响降到最低，
首次采集才在远端 sleep 一次取双样本，之后把 /proc/stat 快照缓存在服务端，
后续每次只读一行 /proc/stat 与上次快照做差值，远端不再有任何等待。

另外整份采集结果会在服务端短暂缓存，多个用户/多个浏览器同时查看主机列表时
不会对同一台主机重复发起探测。
"""
import json
import time
from threading import Thread

from django.db import close_old_connections
from django.views.generic import View
from django_redis import get_redis_connection

from libs import json_response, JsonParser, Argument, auth
from apps.account.utils import get_host_perms
from apps.host.models import Host

# 采集结果缓存时长，需小于前端轮询间隔（30s），避免列表出现明显的数据滞留
RESULT_TTL = 15
# /proc/stat 快照保留时长，超时则退化为一次带 sleep 的双样本采集
SNAPSHOT_TTL = 300
# 单次差值窗口上限，超过则认为快照过旧，本次不给出 CPU 值
MAX_DELTA_WINDOW = 120

# ---- 秒级网络采样 ----
# 前端停止轮询后，采样线程最多再存活这么久（心跳键 TTL）
NET_WATCH_TTL = 15
# 采样结果有效期，采样线程异常退出后前端很快感知到"无数据"
NET_RESULT_TTL = 5
# 采样间隔
NET_SAMPLE_INTERVAL = 1

# nvidia-smi 常见安装位置。exec_command 是非交互式 shell，不会加载 /etc/profile
# 或 ~/.bashrc，PATH 往往只有最小集合，仅靠 command -v 会漏掉容器与自定义安装。
GPU_PROBE = r'''
echo SPUG_PROBE_GPU
_NS=""
for _P in nvidia-smi /usr/bin/nvidia-smi /usr/local/bin/nvidia-smi \
          /usr/local/nvidia/bin/nvidia-smi /opt/bin/nvidia-smi; do
  if command -v "$_P" >/dev/null 2>&1 || [ -x "$_P" ]; then _NS="$_P"; break; fi
done
if [ -n "$_NS" ]; then
  # 驱动异常时 nvidia-smi 可能长时间挂起，加超时避免拖死整次采集
  if command -v timeout >/dev/null 2>&1; then
    timeout 3 "$_NS" --query-gpu=utilization.gpu,memory.used,memory.total \
      --format=csv,noheader,nounits 2>/dev/null
  else
    "$_NS" --query-gpu=utilization.gpu,memory.used,memory.total \
      --format=csv,noheader,nounits 2>/dev/null
  fi
fi
exit 0
'''

# 首次采集：远端 sleep 1s 取双样本，用于建立 /proc/stat 与 /proc/net/dev 基线
PROBE_COMMAND_FULL = r'''
head -1 /proc/stat
grep -E '^(MemTotal|MemAvailable|SwapTotal|SwapFree):' /proc/meminfo
echo SPUG_PROBE_NET
cat /proc/net/dev
sleep 1
echo SPUG_PROBE_STAT2
head -1 /proc/stat
echo SPUG_PROBE_NET
cat /proc/net/dev
echo SPUG_PROBE_DISK
df -kP -x tmpfs -x devtmpfs -x overlay -x squashfs 2>/dev/null | tail -n +2
''' + GPU_PROBE

# 后续采集：只取单样本与服务端缓存的快照做差值，远端无 sleep
PROBE_COMMAND_FAST = r'''
head -1 /proc/stat
grep -E '^(MemTotal|MemAvailable|SwapTotal|SwapFree):' /proc/meminfo
echo SPUG_PROBE_NET
cat /proc/net/dev
echo SPUG_PROBE_STAT2
echo SPUG_PROBE_DISK
df -kP -x tmpfs -x devtmpfs -x overlay -x squashfs 2>/dev/null | tail -n +2
''' + GPU_PROBE


def _parse_cpu_line(line):
    # cpu  user nice system idle iowait irq softirq steal ...
    fields = [int(x) for x in line.split()[1:]]
    idle = fields[3] + (fields[4] if len(fields) > 4 else 0)
    return sum(fields), idle


def _parse_net_lines(text):
    """汇总 /proc/net/dev 中除 lo 外全部接口的收发字节数，返回 (rx, tx)。"""
    rx = tx = 0
    found = False
    for line in text.strip().splitlines():
        if ':' not in line:
            continue
        name, _, data = line.partition(':')
        name = name.strip()
        if name == 'lo':
            continue
        fields = data.split()
        if len(fields) < 9:
            continue
        try:
            rx += int(fields[0])
            tx += int(fields[8])
        except ValueError:
            continue
        found = True
    return (rx, tx) if found else None


def _net_speed(prev, cur, seconds):
    """根据两次采样计算网络速率（KB/s），计数回绕或窗口异常时返回 None。"""
    if not prev or not cur or seconds <= 0:
        return None
    rx_delta, tx_delta = cur[0] - prev[0], cur[1] - prev[1]
    if rx_delta < 0 or tx_delta < 0:
        return None
    return {
        'rx_speed': round(rx_delta / seconds / 1024, 1),   # KB/s
        'tx_speed': round(tx_delta / seconds / 1024, 1),
    }


def _parse_output(output, prev_stat=None):
    """解析探针输出。

    prev_stat 为服务端缓存的上一次 /proc/stat 快照 (total, idle)。
    返回 (result, cur_stat, cur_net)，cur_stat/cur_net 供调用方缓存，
    供下次差值使用。network 为 None 时表示需要调用方用快照计算。
    """
    result = {'cpu': None, 'memory': None, 'swap': None, 'disk': [], 'gpu': [], 'network': None}
    try:
        head_all, stat2_part = output.split('SPUG_PROBE_STAT2', 1)
        stat2_all, disk_part = stat2_part.split('SPUG_PROBE_DISK', 1)
        disk_lines, gpu_lines = disk_part.split('SPUG_PROBE_GPU', 1)
    except ValueError:
        return result, None, None
    # 网络采样紧跟在 CPU/内存之后；双样本模式下 STAT2 段里还有第二份
    head, _, net1_lines = head_all.partition('SPUG_PROBE_NET')
    stat2_lines, _, net2_lines = stat2_all.partition('SPUG_PROBE_NET')

    mem_total = mem_available = swap_total = swap_free = None
    stat1 = None
    for line in head.strip().splitlines():
        if line.startswith('cpu '):
            stat1 = _parse_cpu_line(line)
        elif line.startswith('MemTotal:'):
            mem_total = int(line.split()[1])
        elif line.startswith('MemAvailable:'):
            mem_available = int(line.split()[1])
        elif line.startswith('SwapTotal:'):
            swap_total = int(line.split()[1])
        elif line.startswith('SwapFree:'):
            swap_free = int(line.split()[1])

    # 双样本模式：同次采集内直接差值，精度最高
    stat2 = None
    for line in stat2_lines.strip().splitlines():
        if line.startswith('cpu '):
            stat2 = _parse_cpu_line(line)

    net1 = _parse_net_lines(net1_lines)
    net2 = _parse_net_lines(net2_lines)
    cur_net = net2 or net1
    if net1 and net2:
        # 双样本间隔来自远端 sleep 1，直接按 1s 计算
        result['network'] = _net_speed(net1, net2, 1.0)

    cur_stat = stat2 or stat1
    base_stat = stat1 if stat2 else prev_stat
    target_stat = stat2 or stat1

    if base_stat and target_stat:
        total_delta = target_stat[0] - base_stat[0]
        idle_delta = target_stat[1] - base_stat[1]
        # total_delta <= 0 说明主机重启导致计数器回绕，跳过本次
        if total_delta > 0 and idle_delta >= 0:
            result['cpu'] = round((1 - idle_delta / total_delta) * 100, 1)

    if mem_total and mem_available is not None:
        result['memory'] = {
            'total': round(mem_total / 1048576, 1),        # GB
            'used': round((mem_total - mem_available) / 1048576, 1),
            'percent': round((mem_total - mem_available) / mem_total * 100, 1),
        }

    if swap_total and swap_free is not None:
        result['swap'] = {
            'total': round(swap_total / 1048576, 1),       # GB
            'used': round((swap_total - swap_free) / 1048576, 1),
            'percent': round((swap_total - swap_free) / swap_total * 100, 1),
        }
    elif swap_total == 0:
        # 未启用 swap 的主机明确标记，前端据此展示"未启用"而非留白
        result['swap'] = {'total': 0, 'used': 0, 'percent': 0, 'disabled': True}

    for line in disk_lines.strip().splitlines():
        fields = line.split()
        if len(fields) >= 6 and fields[5].startswith('/'):
            try:
                total_kb, used_kb = int(fields[1]), int(fields[2])
            except ValueError:
                continue
            if total_kb <= 0:
                continue
            result['disk'].append({
                'mount': fields[5],
                'total': round(total_kb / 1048576, 1),     # GB
                'used': round(used_kb / 1048576, 1),
                'percent': round(used_kb / total_kb * 100, 1),
            })

    for line in gpu_lines.strip().splitlines():
        fields = [x.strip() for x in line.split(',')]
        if len(fields) == 3:
            try:
                util, mem_used, mem_all = float(fields[0]), float(fields[1]), float(fields[2])
            except ValueError:
                continue
            result['gpu'].append({
                'percent': round(util, 1),
                'memory_used': round(mem_used / 1024, 1),  # GB
                'memory_total': round(mem_all / 1024, 1),
            })
    return result, cur_stat, cur_net


class MetricsView(View):
    @auth('host.host.view')
    def get(self, request):
        form, error = JsonParser(
            Argument('id', type=int, help='参数错误'),
        ).parse(request.GET)
        if error is not None:
            return json_response(error=error)
        host = Host.objects.filter(pk=form.id).first()
        if not host:
            return json_response(error='未找到指定主机')
        if not request.user.is_supper and host.id not in get_host_perms(request.user):
            return json_response(error='无权访问该主机')
        # 采集类错误放入 data 返回，避免前端轮询时反复弹出全局错误提示
        if not host.is_verified:
            return json_response({'error': '主机未验证'})

        rds = get_redis_connection()
        result_key, snap_key = f'spug:metrics:{host.id}', f'spug:metrics:stat:{host.id}'

        # 多个用户/浏览器同时查看列表时，命中缓存直接返回，不重复探测
        try:
            cached = rds.get(result_key)
        except Exception:
            cached = None
        if cached:
            return json_response(json.loads(cached))

        prev_stat = prev_net = None
        prev_ts = 0
        try:
            raw = rds.get(snap_key)
            if raw:
                data = json.loads(raw)
                total, idle, ts = data[0], data[1], data[2]
                # 快照过旧时窗口内可能已发生重启或计数回绕，退化为双样本采集
                if time.time() - ts <= MAX_DELTA_WINDOW:
                    prev_stat, prev_ts = (total, idle), ts
                    # 兼容扩展前的三元快照，缺网络计数时本次不给出网速
                    if len(data) >= 5:
                        prev_net = (data[3], data[4])
        except Exception:
            prev_stat = prev_net = None

        command = PROBE_COMMAND_FAST if prev_stat else PROBE_COMMAND_FULL
        try:
            with host.get_ssh() as ssh:
                exit_code, output = ssh.exec_command_raw(command)
        except Exception as e:
            return json_response({'error': f'连接失败: {e}'})
        if exit_code != 0:
            return json_response({'error': f'采集失败: {output[:200]}'})

        now = time.time()
        result, cur_stat, cur_net = _parse_output(output, prev_stat)
        # 快速模式下网速由本次计数与服务端快照差值得出
        if result['network'] is None and prev_net and cur_net:
            result['network'] = _net_speed(prev_net, cur_net, now - prev_ts)
        try:
            if cur_stat:
                snapshot = [cur_stat[0], cur_stat[1], now]
                if cur_net:
                    snapshot += [cur_net[0], cur_net[1]]
                rds.setex(snap_key, SNAPSHOT_TTL, json.dumps(snapshot))
            rds.setex(result_key, RESULT_TTL, json.dumps(result))
        except Exception:
            pass
        return json_response(result)


def _net_sampler(host_id):
    """秒级网络采样线程。

    复用一条持久 SSH 连接，每秒仅执行一次 cat /proc/net/dev（读内存文件，
    微秒级开销，无握手无磁盘 IO），把速率写入 Redis 供前端轻量轮询。

    生命周期完全由心跳键驱动：前端每次轮询续期心跳，页面关闭后心跳过期，
    线程自动退出并断开 SSH。Redis 锁保证同一主机全局只有一条采样线程
    （跨 gunicorn worker、跨浏览器去重）。
    """
    rds = get_redis_connection()
    lock_key = f'spug:metrics:net:lock:{host_id}'
    watch_key = f'spug:metrics:net:watch:{host_id}'
    result_key = f'spug:metrics:net:{host_id}'
    # nx 抢锁失败说明其他 worker 已有采样线程在跑
    if not rds.set(lock_key, '1', nx=True, ex=NET_SAMPLE_INTERVAL * 5):
        return
    close_old_connections()
    try:
        host = Host.objects.filter(pk=host_id).first()
        if not host or not host.is_verified:
            return
        with host.get_ssh() as ssh:
            prev, prev_ts = None, 0
            while rds.exists(watch_key):
                exit_code, output = ssh.exec_command_raw('cat /proc/net/dev')
                now = time.time()
                if exit_code == 0:
                    cur = _parse_net_lines(output)
                    speed = _net_speed(prev, cur, now - prev_ts) if prev else None
                    if speed is not None:
                        speed['ts'] = round(now, 1)
                        rds.setex(result_key, NET_RESULT_TTL, json.dumps(speed))
                    prev, prev_ts = cur, now
                rds.expire(lock_key, NET_SAMPLE_INTERVAL * 5)
                time.sleep(NET_SAMPLE_INTERVAL)
    except Exception:
        pass
    finally:
        try:
            rds.delete(lock_key)
        except Exception:
            pass
        close_old_connections()


@auth('host.host.view|host.console.view')
def get_net_metrics(request):
    """轻量接口：读 Redis 缓存的秒级网速，必要时拉起采样线程。不做任何 SSH 操作。"""
    form, error = JsonParser(
        Argument('id', type=int, help='参数错误'),
    ).parse(request.GET)
    if error is not None:
        return json_response(error=error)
    if not request.user.is_supper and form.id not in get_host_perms(request.user):
        return json_response(error='无权访问该主机')

    rds = get_redis_connection()
    # 续期心跳：只要前端还在轮询，采样线程就持续存活
    rds.setex(f'spug:metrics:net:watch:{form.id}', NET_WATCH_TTL, '1')
    if not rds.exists(f'spug:metrics:net:lock:{form.id}'):
        Thread(target=_net_sampler, args=(form.id,), daemon=True).start()
    cached = rds.get(f'spug:metrics:net:{form.id}')
    if cached:
        return json_response(json.loads(cached))
    # 采样线程尚未产出首个差值（冷启动约需 2 个采样周期）
    return json_response(None)
