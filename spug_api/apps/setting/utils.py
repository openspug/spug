from apps.setting.models import GlobalConfig
from paramiko.rsakey import RSAKey
from io import StringIO
from libs.ssh import generate_ssh_key


def generate_and_save_ssh_key():
    keys = GlobalConfig.query.filter(GlobalConfig.name.in_(['ssh_private_key', 'ssh_public_key'])).all()
    if len(keys) == 0:
        key_obj = StringIO()
        key = RSAKey.generate(2048)
        key.write_private_key(key_obj)
        private_key, public_key = generate_ssh_key()
        GlobalConfig(name='ssh_private_key', value=private_key, desc='SSH私钥').add()
        GlobalConfig(name='ssh_public_key', value=public_key, desc='SSH公钥').save()
        return key, key.get_base64()
    else:
        raise Exception('Already has ssh key')
