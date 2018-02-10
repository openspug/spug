from apps.deploy.models import ImageConfig, DeployMenu
from apps.configuration.models import ConfigKey, ConfigValue
from apps.apis.utils import MapConfigValues
from libs.utils import Container
from libs.tools import is_valid_ip
from collections import defaultdict
import base64
import uuid
import os


def add_file_to_tar(tar, file):
    tarinfo = tar.gettarinfo(file, os.path.basename(file))
    tarinfo.mode = 0o755
    with open(file, "rb") as f:
        tar.addfile(tarinfo, f)


def create_container(ctr: Container, pro, env, **kwargs):
    env_configs = {x.name: x.value for x in ImageConfig.query.filter_by(img_id=pro.image_id).all()}
    config_keys = ConfigKey.query.filter_by(owner_type='app', owner_id=pro.id, type='system').all()
    config_values = ConfigValue.query.filter(
        ConfigValue.key_id.in_([x.id for x in config_keys])).all() if config_keys else []
    menu_start = DeployMenu.query.filter_by(app_id=pro.id, name='容器启动').first()
    map_values = MapConfigValues(config_values, env.id)
    app_configs = {x.name: map_values.get(x.id) for x in config_keys}
    hostname = app_configs.pop('__HOST_NAME', None) or None
    host_config = dict(
        mem_limit=app_configs.pop('__MEM_LIMIT', None) or None,
        network_mode=app_configs.pop('__NETWORK_MODE', None) or 'default',
        dns=app_configs.pop('__DNS_SERVER').split(';') if app_configs.get('__DNS_SERVER') else None,
        restart_policy={'Name': 'always'}
    )
    expose_port = app_configs.pop('__EXPOSE_PORT', None)
    if expose_port and host_config['network_mode'] == 'default':
        kwargs.setdefault('ports', [])
        host_config['port_bindings'] = defaultdict(list)
        for item in expose_port.split(';'):
            value = item.split(':') if item.count(':') == 2 else ['0.0.0.0'] + item.split(':')
            if value[2] not in kwargs['ports']:
                kwargs['ports'].append(value[2])
            host_config['port_bindings'][value[2]].append(tuple(value[:2]))
    bind_volume = app_configs.pop('__BIND_VOLUME', None)
    if bind_volume:
        kwargs.setdefault('volumes', [])
        host_config.setdefault('binds', [])
        for item in bind_volume.split(';'):
            kwargs['volumes'].append(item.split(':')[1])
            host_config['binds'].append(item)
    ctr.create_host_config(**host_config)
    env_configs.update(app_configs)
    env_configs['__API_TOKEN'] = uuid.uuid4().hex
    env_configs['__DEPLOY_START'] = base64.b64encode(menu_start.command.encode()).decode()
    ctr.create(
        name=ctr.name,
        hostname=hostname,
        entrypoint='/entrypoint.sh',
        environment=env_configs,
        **kwargs
    )
    return env_configs['__API_TOKEN']


def valid_app_setting(name: str, values: list):
    ok, message = False, None
    if name == '__MEM_LIMIT':
        if all([x[:-1].isdigit() and (x.lower().endswith('m') or x.lower().endswith('g')) for x in values if x != '']):
            ok = True
        else:
            message = '请输入以【m|M|g|G】结尾的格式！'
    elif name == '__DNS_SERVER':
        if all([is_valid_ip(*x.split(';')) for x in values if x != '']):
            ok = True
        else:
            message = '请输入以分号分隔的一个或多个合法的IP地址！'
    elif name == '__NETWORK_MODE':
        if all([x in ['default', 'none', 'host'] for x in values if x != '']):
            ok = True
        else:
            message = '网络模式仅支持【default | none | host】！'
    elif name == '__EXPOSE_PORT':
        objects = []
        [objects.extend(x) for x in [x.split(';') for x in values if x != '']]
        try:
            for item in [x.split(':') for x in objects]:
                if len(item) == 3:
                    assert is_valid_ip(item[0])
                    assert 0 < int(item[1]) <= 65535
                    assert 0 < int(item[2]) <= 65535
                elif len(item) == 2:
                    assert 0 < int(item[0]) <= 65535
                    assert 0 < int(item[1]) <= 65535
                else:
                    assert False
            ok = True
        except (AssertionError, ValueError):
            message = '无效的映射端口，示例：127.0.0.1:3306:3306;80:5000'
    elif name == '__BIND_VOLUME':
        try:
            for item in [x.split(':') for x in values if x != '']:
                assert item[0].startswith('/')
                assert item[1].startswith('/')
                if len(item) == 3:
                    assert item[3] in ['ro', 'rw']
            ok = True
        except (AssertionError, IndexError, ValueError):
            message = '无效的映射目录，示例：/home/user1:/mnt/vol1;/home/user2:/mnt/vol2:ro'
    elif name == '__HOST_NAME':
        ok = True
    else:
        message = '不支持的设置参数 ' + name
    return ok, message


def get_built_in_menus(name=None):
    all_valid_menus = {
        '容器创建': {'name': '容器创建', 'desc': '预定义：容器被创建后执行，用于初始化容器', 'command': ''},
        '应用发布': {'name': '应用发布', 'desc': '预定义：点击发布按钮执行发布时执行', 'command': ''},
        '容器启动': {'name': '容器启动', 'desc': '预定义：容器启动时执行', 'command': ''}
    }
    if name is None:
        return all_valid_menus
    elif name in all_valid_menus:
        return all_valid_menus[name]
    else:
        raise TypeError('Invalid name <%r> for built in menus' % name)
