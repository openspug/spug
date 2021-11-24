# Copyright: (c) OpenSpug Organization. https://github.com/openspug/spug
# Copyright: (c) <spug.dev@gmail.com>
# Released under the AGPL-3.0 License.
from libs import json_response, JsonParser, Argument, auth
from apps.host.models import Host, HostExtend, Group
from apps.host import utils
import json


@auth('host.host.add')
def get_regions(request):
    form, error = JsonParser(
        Argument('type', filter=lambda x: x in ('ali', 'tencent'), help='参数错误'),
        Argument('ak', help='请输入AccessKey ID'),
        Argument('ac', help='请输入AccessKey Secret'),
    ).parse(request.GET)
    if error is None:
        response = []
        if form.type == 'ali':
            for item in utils.fetch_ali_regions(form.ak, form.ac):
                response.append({'id': item['RegionId'], 'name': item['LocalName']})
        else:
            for item in utils.fetch_tencent_regions(form.ak, form.ac):
                response.append({'id': item['Region'], 'name': item['RegionName']})
        return json_response(response)
    return json_response(error=error)


@auth('host.host.add')
def cloud_import(request):
    form, error = JsonParser(
        Argument('type', filter=lambda x: x in ('ali', 'tencent'), help='参数错误'),
        Argument('ak', help='请输入AccessKey ID'),
        Argument('ac', help='请输入AccessKey Secret'),
        Argument('region_id', help='请选择区域'),
        Argument('group_id', type=int, help='请选择分组'),
        Argument('username', help='请输入默认SSH用户名'),
        Argument('port', type=int, help='请输入默认SSH端口号'),
        Argument('host_type', filter=lambda x: x in ('public', 'private'), help='请选择连接地址'),
    ).parse(request.body)
    if error is None:
        group = Group.objects.filter(pk=form.group_id).first()
        if not group:
            return json_response(error='未找到指定分组')
        if form.type == 'ali':
            instances = utils.fetch_ali_instances(form.ak, form.ac, form.region_id)
        else:
            instances = utils.fetch_tencent_instances(form.ak, form.ac, form.region_id)

        host_add_ids = []
        for item in instances:
            instance_id = item['instance_id']
            host_name = item.pop('instance_name')
            public_ips = item['public_ip_address'] or []
            private_ips = item['private_ip_address'] or []
            item['public_ip_address'] = json.dumps(public_ips)
            item['private_ip_address'] = json.dumps(private_ips)
            if HostExtend.objects.filter(instance_id=instance_id).exists():
                HostExtend.objects.filter(instance_id=instance_id).update(**item)
            else:
                if form.host_type == 'public':
                    hostname = public_ips[0] if public_ips else ''
                else:
                    hostname = private_ips[0] if private_ips else ''
                host = Host.objects.create(
                    name=host_name,
                    hostname=hostname,
                    port=form.port,
                    username=form.username,
                    created_by=request.user)
                HostExtend.objects.create(host=host, **item)
                host_add_ids.append(host.id)
        if host_add_ids:
            group.hosts.add(*host_add_ids)
        return json_response(len(instances))
    return json_response(error=error)
