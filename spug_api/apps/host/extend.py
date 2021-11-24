# Copyright: (c) OpenSpug Organization. https://github.com/openspug/spug
# Copyright: (c) <spug.dev@gmail.com>
# Released under the AGPL-3.0 License.
from django.views.generic import View
from libs import json_response, JsonParser, Argument, human_datetime, auth
from apps.host.models import Host, HostExtend
from apps.host.utils import check_os_type, fetch_host_extend
import json


class ExtendView(View):
    @auth('host.host.add|host.host.edit')
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
            ssh = host.get_ssh()
            response = fetch_host_extend(ssh)
            return json_response(response)
        return json_response(error=error)

    @auth('host.host.add|host.host.edit')
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
