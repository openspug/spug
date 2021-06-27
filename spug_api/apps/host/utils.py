# Copyright: (c) OpenSpug Organization. https://github.com/openspug/spug
# Copyright: (c) <spug.dev@gmail.com>
# Released under the AGPL-3.0 License.
from libs.helper import make_ali_request, make_tencent_request
from collections import defaultdict
from datetime import datetime, timezone


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
