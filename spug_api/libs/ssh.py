from paramiko.client import SSHClient, AutoAddPolicy
from paramiko.config import SSH_PORT
from paramiko.rsakey import RSAKey
from io import StringIO


class SSH:
    def __init__(self, host, port=SSH_PORT, username='root', pkey=None, password=None, connect_timeout=10):
        if pkey is None and password is None:
            raise Exception('public key and password must have one is not None')
        self.client = None
        self.arguments = {
            'hostname': host,
            'port': port,
            'username': username,
            'password': password,
            'pkey': pkey,
            'timeout': connect_timeout,
        }

    @staticmethod
    def generate_key():
        key_obj = StringIO()
        key = RSAKey.generate(2048)
        key.write_private_key(key_obj)
        return key_obj.getvalue(), 'ssh-rsa ' + key.get_base64()

    def add_public_key(self, public_key):
        command = f'mkdir -p -m 700 ~/.ssh && \
        echo {public_key!r} >> ~/.ssh/authorized_keys && \
        chmod 600 ~/.ssh/authorized_keys'
        code, stdout, stderr = self.exec_command(command)
        if code != 0:
            raise Exception(stdout + stderr)

    def ping(self):
        with self:
            return True

    def exec_command(self, command):
        with self as cli:
            _, stdout, stderr = cli.exec_command(command)
            return stdout.channel.recv_exit_status(), ''.join(stdout), ''.join(stderr)

    def exec_command_with_stream(self, command):
        with self as cli:
            _, stdout, _ = cli.exec_command(command, get_pty=True)
            while True:
                message = stdout.readline()
                if not message:
                    break
                yield message

    def __enter__(self):
        if self.client is not None:
            raise RuntimeError('Already connected')
        client = SSHClient()
        client.set_missing_host_key_policy(AutoAddPolicy)
        client.connect(**self.arguments)
        self.client = client
        return self.client

    def __exit__(self, exc_type, exc_val, exc_tb):
        self.client.close()
        self.client = None
