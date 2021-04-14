# Copyright: (c) OpenSpug Organization. https://github.com/openspug/spug
# Copyright: (c) <spug.dev@gmail.com>
# Released under the AGPL-3.0 License.
from django.views.generic import View
from libs import json_response, JsonParser, Argument, human_datetime
from apps.host.models import Host, HostExtend
from apps.host.utils import check_os_type
import ipaddress
import json


class ExtendView(View):
    def get(self, request):
        form, error = JsonParser(
            Argument('host_id', type=int, help='参数错误')
        ).parse(request.GET)
        if error is None:
            host = Host.objects.filter(pk=form.host_id).first()
            if not host:
                return json_response(error='未找到指定主机')
            if not host.is_verified:
                return json_response(error='该主机还未验证')
            cli = host.get_ssh()
            commands = [
                "lscpu | grep '^CPU(s)' | awk '{print $2}'",
                "free -m | awk 'NR==2{print $2}'",
                "hostname -I",
                "cat /etc/os-release | grep PRETTY_NAME | awk -F \\\" '{print $2}'",
                "fdisk -l | grep '^Disk /' | awk '{print $5}'"
            ]
            code, out = cli.exec_command(';'.join(commands))
            if code != 0:
                return json_response(error=f'Exception: {out}')
            response = {'disk': [], 'public_ip_address': [], 'private_ip_address': []}
            for index, line in enumerate(out.strip().split('\n')):
                if index == 0:
                    response['cpu'] = int(line)
                elif index == 1:
                    response['memory'] = round(int(line) / 1000, 1)
                elif index == 2:
                    for ip in line.split():
                        if ipaddress.ip_address(ip).is_global:
                            response['public_ip_address'].append(ip)
                        else:
                            response['private_ip_address'].append(ip)
                elif index == 3:
                    response['os_name'] = line
                else:
                    response['disk'].append(round(int(line) / 1024 / 1024 / 1024, 0))
            return json_response(response)
        return json_response(error=error)

    def post(self, request):
        form, error = JsonParser(
            Argument('host_id', type=int, help='参数错误'),
            Argument('instance_id', required=False),
            Argument('os_name', help='请输入操作系统'),
            Argument('cpu', type=int, help='请输入CPU核心数'),
            Argument('memory', type=float, help='请输入内存大小'),
            Argument('disk', type=list, filter=lambda x: len(x), help='请添加磁盘'),
            Argument('private_ip_address', type=list, filter=lambda x: len(x), help='请添加内网IP'),
            Argument('public_ip_address', type=list, required=False),
            Argument('instance_charge_type', default='Other'),
            Argument('internet_charge_type', default='Other'),
            Argument('created_time', required=False),
            Argument('expired_time', required=False)
        ).parse(request.body)
        if error is None:
            host = Host.objects.filter(pk=form.host_id).first()
            form.disk = json.dumps(form.disk)
            form.public_ip_address = json.dumps(form.public_ip_address) if form.public_ip_address else '[]'
            form.private_ip_address = json.dumps(form.private_ip_address)
            form.updated_at = human_datetime()
            form.os_type = check_os_type(form.os_name)
            if hasattr(host, 'hostextend'):
                extend = host.hostextend
                extend.update_by_dict(form)
            else:
                extend = HostExtend.objects.create(host=host, **form)
            return json_response(extend.to_view())
        return json_response(error=error)
