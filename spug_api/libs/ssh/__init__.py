from paramiko.client import SSHClient, AutoAddPolicy
from paramiko.ssh_exception import AuthenticationException
from paramiko.rsakey import RSAKey
from apps.setting import Setting
from io import StringIO


def generate_ssh_key():
    key_obj = StringIO()
    key = RSAKey.generate(2048)
    key.write_private_key(key_obj)
    return key_obj.getvalue(), 'ssh-rsa ' + key.get_base64()


def add_public_key(hostname, port, password):
    ssh_client = SSHClient()
    ssh_client.set_missing_host_key_policy(AutoAddPolicy)
    ssh_client.connect(
        hostname,
        port=port,
        username='root',
        password=password
    )
    try:
        _, stdout, stderr = ssh_client.exec_command('mkdir -p -m 700 /root/.ssh && \
        echo %r >> /root/.ssh/authorized_keys && \
        chmod 600 /root/.ssh/authorized_keys' % Setting.ssh_public_key)
        if stdout.channel.recv_exit_status() != 0:
            raise Exception('Add public key error: ' + ''.join(x for x in stderr))
    finally:
        ssh_client.close()


def get_ssh_client(hostname, port):
    ssh_client = SSHClient()
    ssh_client.set_missing_host_key_policy(AutoAddPolicy)
    ssh_client.connect(
        hostname,
        port=port,
        username='root',
        timeout=5,
        pkey=RSAKey.from_private_key(StringIO(Setting.ssh_private_key)))
    return ssh_client


def ssh_exec_command(hostname, port, command):
    ssh_client = get_ssh_client(hostname, port)
    try:
        _, stdout, stderr = ssh_client.exec_command(command)
        return stdout.channel.recv_exit_status(), ''.join(x for x in stdout), ''.join(x for x in stderr)
    except Exception as e:
        return 256, e, None
    finally:
        ssh_client.close()


def ssh_exec_command_with_stream(ssh_client, command):
    try:
        _, stdout, _ = ssh_client.exec_command(command, get_pty=True)
    except Exception as e:
        ssh_client.close()
        raise e
    while True:
        message = stdout.readline()
        if not message:
            break
        yield message
    ssh_client.close()


def ssh_ping(hostname, port):
    ssh_client = SSHClient()
    ssh_client.set_missing_host_key_policy(AutoAddPolicy)
    try:
        ssh_client.connect(
            hostname,
            port=port,
            username='root',
            timeout=5,
            pkey=RSAKey.from_private_key(StringIO(Setting.ssh_private_key)))
    except AuthenticationException:
        return False
    ssh_client.close()
    return True
