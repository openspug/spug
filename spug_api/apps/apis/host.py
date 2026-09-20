# Copyright: (c) OpenSpug Organization. https://github.com/openspug/spug
# Copyright: (c) <spug.dev@gmail.com>
# Released under the AGPL-3.0 License.
from apps.apis.utils import api_key_required, api_response
from apps.host.models import Host, Group
from django.http.response import JsonResponse
from collections import Counter
import json


@api_key_required
def get_inventory(request):
    """只读主机清单，不含任何凭据。format=ansible（默认，动态 inventory 格式）| json（主机列表）"""
    fmt = request.GET.get('format', 'ansible')
    if fmt not in ('ansible', 'json'):
        return api_response(error='Unsupported output format', status=400)

    groups = list(Group.objects.prefetch_related('hosts'))
    # 分组名可重复（不同父级下同名），重名时追加 id 保证 inventory 的组键唯一
    counter = Counter(x.name for x in groups)
    names = {x.id: x.name if counter[x.name] == 1 else f'{x.name}_{x.id}' for x in groups}
    host_groups = {}
    for group in groups:
        for host in group.hosts.all():
            host_groups.setdefault(host.id, []).append(names[group.id])

    hosts = Host.objects.select_related('hostextend')
    if fmt == 'json':
        return api_response([_host_view(x, host_groups.get(x.id, [])) for x in hosts])

    hostvars = {}
    for host in hosts:
        view = _host_view(host, host_groups.get(host.id, []))
        hostvars[host.name] = {
            'ansible_host': host.hostname,
            'ansible_port': host.port,
            'ansible_user': host.username,
            **{f'spug_{k}': v for k, v in view.items() if k not in ('name', 'hostname', 'port', 'username')}
        }
    inventory = {'_meta': {'hostvars': hostvars}}
    for group in groups:
        inventory[names[group.id]] = {
            'hosts': [x.name for x in group.hosts.all()],
            'children': [names[x.id] for x in groups if x.parent_id == group.id]
        }
    inventory['all'] = {'children': ['ungrouped'] + [names[x.id] for x in groups if x.parent_id == 0]}
    inventory['ungrouped'] = {'hosts': [x.name for x in hosts if x.id not in host_groups]}
    return JsonResponse(inventory, json_dumps_params={'ensure_ascii': False})


def _host_view(host, groups):
    data = dict(
        id=host.id,
        name=host.name,
        hostname=host.hostname,
        port=host.port,
        username=host.username,
        desc=host.desc,
        is_verified=host.is_verified,
        groups=groups,
    )
    if hasattr(host, 'hostextend'):
        extend = host.hostextend
        data.update(
            os_name=extend.os_name,
            os_type=extend.os_type,
            cpu=extend.cpu,
            memory=extend.memory,
            private_ip_address=json.loads(extend.private_ip_address),
            public_ip_address=json.loads(extend.public_ip_address),
        )
    return data
