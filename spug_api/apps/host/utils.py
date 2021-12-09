# Copyright: (c) OpenSpug Organization. https://github.com/openspug/spug
# Copyright: (c) <spug.dev@gmail.com>
# Released under the AGPL-3.0 License.
from django_redis import get_redis_connection
from libs.helper import make_ali_request, make_tencent_request
from libs.ssh import SSH, AuthenticationException
from libs.utils import AttrDict, human_datetime
from libs.validators import ip_validator
from apps.host.models import HostExtend
from apps.setting.utils import AppSetting
from collections import defaultdict
from datetime import datetime, timezone
from concurrent import futures
import ipaddress
import json
import math
import os


def check_os_type(os_name):
    os_name = os_name.lower()
    types = ('centos', 'coreos', 'debian', 'suse', 'ubuntu', 'windows', 'freebsd', 'tencent', 'alibaba')
    for t in types:
        if t in os_name:
            return t
    return 'unknown'


def check_instance_charge_type(value, supplier):
    if supplier == 'ali':
        if value in ('PrePaid', 'PostPaid'):
            return value
        else:
            return 'Other'
    if supplier == 'tencent':
        if value == 'PREPAID':
            return 'PrePaid'
        if value == 'POSTPAID_BY_HOUR':
            return 'PostPaid'
        return 'Other'


def check_internet_charge_type(value, supplier):
    if supplier == 'ali':
        if value in ('PayByTraffic', 'PayByBandwidth'):
            return value
        else:
            return 'Other'
    if supplier == 'tencent':
        if value == 'TRAFFIC_POSTPAID_BY_HOUR':
            return 'PayByTraffic'
        if value in ('BANDWIDTH_PREPAID', 'BANDWIDTH_POSTPAID_BY_HOUR'):
            return 'PayByBandwidth'
        return 'Other'


def parse_utc_date(value):
    if not value:
        return None
    s_format = '%Y-%m-%dT%H:%M:%SZ'
    if len(value) == 17:
        s_format = '%Y-%m-%dT%H:%MZ'
    date = datetime.strptime(value, s_format).replace(tzinfo=timezone.utc)
    return date.astimezone().strftime('%Y-%m-%d %H:%M:%S')


def fetch_ali_regions(ak, ac):
    params = dict(Action='DescribeRegions')
    res = make_ali_request(ak, ac, 'http://ecs.aliyuncs.com', params)
    if 'Regions' in res:
        return res['Regions']['Region']
    else:
        raise Exception(res)


def fetch_ali_disks(ak, ac, region_id, page_number=1):
    data, page_size = defaultdict(list), 20
    params = dict(
        Action='DescribeDisks',
        RegionId=region_id,
        PageNumber=page_number,
        PageSize=page_size
    )
    res = make_ali_request(ak, ac, 'http://ecs.aliyuncs.com', params)
    if 'Disks' in res:
        for item in res['Disks']['Disk']:
            data[item['InstanceId']].append(item['Size'])
        if len(res['Disks']['Disk']) == page_size:
            page_number += 1
            new_data = fetch_ali_disks(ak, ac, region_id, page_number)
            data.update(new_data)
        return data
    else:
        raise Exception(res)


def fetch_ali_instances(ak, ac, region_id, page_number=1):
    data, page_size = {}, 20
    params = dict(
        Action='DescribeInstances',
        RegionId=region_id,
        PageNumber=page_number,
        PageSize=page_size
    )
    res = make_ali_request(ak, ac, 'http://ecs.aliyuncs.com', params)
    if 'Instances' not in res:
        raise Exception(res)
    for item in res['Instances']['Instance']:
        if 'NetworkInterfaces' in item:
            network_interface = item['NetworkInterfaces']['NetworkInterface']
        else:
            network_interface = []
        data[item['InstanceId']] = dict(
            instance_id=item['InstanceId'],
            instance_name=item['InstanceName'],
            os_name=item['OSName'],
            os_type=check_os_type(item['OSName']),
            cpu=item['Cpu'],
            memory=item['Memory'] / 1024,
            created_time=parse_utc_date(item['CreationTime']),
            expired_time=parse_utc_date(item['ExpiredTime']),
            instance_charge_type=check_instance_charge_type(item['InstanceChargeType'], 'ali'),
            internet_charge_type=check_internet_charge_type(item['InternetChargeType'], 'ali'),
            public_ip_address=item['PublicIpAddress']['IpAddress'],
            private_ip_address=list(map(lambda x: x['PrimaryIpAddress'], network_interface)),
            zone_id=item['ZoneId']
        )
    if len(res['Instances']['Instance']) == page_size:
        new_data = fetch_ali_instances(ak, ac, region_id, page_number + 1)
        data.update(new_data)
    if page_number != 1:
        return data
    for instance_id, disk in fetch_ali_disks(ak, ac, region_id).items():
        if instance_id in data:
            data[instance_id]['disk'] = disk
    return list(data.values())


def fetch_tencent_regions(ak, ac):
    params = dict(Action='DescribeRegions')
    res = make_tencent_request(ak, ac, 'cvm.tencentcloudapi.com', params)
    if 'RegionSet' in res['Response']:
        return res['Response']['RegionSet']
    else:
        raise Exception(res)


def fetch_tencent_instances(ak, ac, region_id, page_number=1):
    data, page_size = [], 20
    params = dict(
        Action='DescribeInstances',
        Region=region_id,
        Offset=(page_number - 1) * page_size,
        Limit=page_size
    )
    res = make_tencent_request(ak, ac, 'cvm.tencentcloudapi.com', params)
    if 'InstanceSet' not in res['Response']:
        raise Exception(res)
    for item in res['Response']['InstanceSet']:
        data_disks = list(map(lambda x: x['DiskSize'], item['DataDisks']))
        internet_charge_type = item['InternetAccessible']['InternetChargeType']
        data.append(dict(
            instance_id=item['InstanceId'],
            instance_name=item['InstanceName'],
            os_name=item['OsName'],
            os_type=check_os_type(item['OsName']),
            cpu=item['CPU'],
            memory=item['Memory'],
            disk=[item['SystemDisk']['DiskSize']] + data_disks,
            created_time=parse_utc_date(item['CreatedTime']),
            expired_time=parse_utc_date(item['ExpiredTime']),
            instance_charge_type=check_instance_charge_type(item['InstanceChargeType'], 'tencent'),
            internet_charge_type=check_internet_charge_type(internet_charge_type, 'tencent'),
            public_ip_address=item['PublicIpAddresses'],
            private_ip_address=item['PrivateIpAddresses'],
            zone_id=item['Placement']['Zone']
        ))
    if len(res['Response']['InstanceSet']) == page_size:
        page_number += 1
        new_data = fetch_tencent_instances(ak, ac, region_id, page_number)
        data.extend(new_data)
    return data


def fetch_host_extend(ssh):
    public_ip_address = set()
    private_ip_address = set()
    response = {'disk': []}
    with ssh:
        code, out = ssh.exec_command_raw('nproc')
        if code != 0:
            code, out = ssh.exec_command_raw("grep -c 'model name' /proc/cpuinfo")
        if code == 0:
            response['cpu'] = int(out.strip())

        code, out = ssh.exec_command_raw("cat /etc/os-release | grep PRETTY_NAME | awk -F \\\" '{print $2}'")
        if '/etc/os-release' in out:
            code, out = ssh.exec_command_raw("cat /etc/issue | head -1 | awk '{print $1,$2,$3}'")
        if code == 0:
            response['os_name'] = out.strip()[:50]

        code, out = ssh.exec_command_raw('hostname -I')
        if code == 0:
            for ip in out.strip().split():
                if ipaddress.ip_address(ip).is_global:
                    public_ip_address.add(ip)
                elif len(private_ip_address) < 10:
                    private_ip_address.add(ip)

        ssh_hostname = ssh.arguments.get('hostname')
        if ip_validator(ssh_hostname):
            if ipaddress.ip_address(ssh_hostname).is_global:
                public_ip_address.add(ssh_hostname)
            else:
                private_ip_address.add(ssh_hostname)

        code, out = ssh.exec_command_raw('lsblk -dbn -o SIZE -e 11 2> /dev/null')
        if code == 0:
            disks = []
            for item in out.strip().splitlines():
                item = item.strip()
                size = math.ceil(int(item) / 1024 / 1024 / 1024)
                if size > 10:
                    disks.append(size)
            response['disk'] = disks[:10]

        code, out = ssh.exec_command_raw("dmidecode -t 17 | grep -E 'Size: [0-9]+' | awk '{s+=$2} END {print s,$3}'")
        if code == 0:
            fields = out.strip().split()
            if len(fields) == 2 and fields[1] in ('GB', 'MB'):
                size, unit = out.strip().split()
                if unit == 'GB':
                    response['memory'] = size
                else:
                    response['memory'] = round(int(size) / 1024, 0)
        if 'memory' not in response:
            code, out = ssh.exec_command_raw("free -m | awk 'NR==2{print $2}'")
            if code == 0:
                response['memory'] = math.ceil(int(out) / 1024)

        response['public_ip_address'] = list(public_ip_address)
        response['private_ip_address'] = list(private_ip_address)
        return response


def batch_sync_host(token, hosts, password):
    private_key, public_key = AppSetting.get_ssh_key()
    threads, latest_exception, rds = [], None, get_redis_connection()
    max_workers = max(10, os.cpu_count() * 5)
    with futures.ThreadPoolExecutor(max_workers=max_workers) as executor:
        for host in hosts:
            t = executor.submit(_sync_host_extend, host, private_key, public_key, password)
            t.host = host
            threads.append(t)
        for t in futures.as_completed(threads):
            exception = t.exception()
            if exception:
                rds.rpush(token, json.dumps({'key': t.host.id, 'status': 'fail', 'message': f'{exception}'}))
            else:
                rds.rpush(token, json.dumps({'key': t.host.id, 'status': 'ok'}))
                t.host.is_verified = True
                t.host.save()
        rds.expire(token, 60)


def _sync_host_extend(host, private_key=None, public_key=None, password=None, ssh=None):
    if not ssh:
        kwargs = host.to_dict(selects=('hostname', 'port', 'username'))
        ssh = _get_ssh(kwargs, host.pkey, private_key, public_key, password)
    form = AttrDict(fetch_host_extend(ssh))
    form.disk = json.dumps(form.disk)
    form.public_ip_address = json.dumps(form.public_ip_address)
    form.private_ip_address = json.dumps(form.private_ip_address)
    form.updated_at = human_datetime()
    form.os_type = check_os_type(form.os_name)
    if hasattr(host, 'hostextend'):
        extend = host.hostextend
        extend.update_by_dict(form)
    else:
        extend = HostExtend.objects.create(host=host, **form)
    return extend


def _get_ssh(kwargs, pkey=None, private_key=None, public_key=None, password=None):
    try:
        ssh = SSH(pkey=pkey or private_key, **kwargs)
        ssh.get_client()
        return ssh
    except AuthenticationException as e:
        if password:
            with SSH(password=str(password), **kwargs) as ssh:
                ssh.add_public_key(public_key)
            return _get_ssh(kwargs, private_key)
        raise e
