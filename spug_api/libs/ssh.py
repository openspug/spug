# Copyright: (c) OpenSpug Organization. https://github.com/openspug/spug
# Copyright: (c) <spug.dev@gmail.com>
# Released under the MIT License.
from paramiko.client import SSHClient, AutoAddPolicy
from paramiko.config import SSH_PORT
from paramiko.rsakey import RSAKey
from paramiko.ssh_exception import AuthenticationException
from io import StringIO


class SSH:
    def __init__(self, hostname, port=SSH_PORT, username='root', pkey=None, password=None, connect_timeout=10):
        if pkey is None and password is None:
            raise Exception('public key and password must have one is not None')
        self.client = None
        self.arguments = {
            'hostname': hostname,
            'port': port,
            'username': username,
            'password': password,
            'pkey': RSAKey.from_private_key(StringIO(pkey)) if isinstance(pkey, str) else pkey,
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
        code, out = self.exec_command(command)
        if code != 0:
            raise Exception(out)

    def ping(self):
        with self:
            return True

    def get_client(self):
        if self.client is not None:
            return self.client
        self.client = SSHClient()
        self.client.set_missing_host_key_policy(AutoAddPolicy)
        self.client.connect(**self.arguments)
        return self.client

    def put_file(self, local_path, remote_path):
        with self as cli:
            sftp = cli.open_sftp()
            sftp.put(local_path, remote_path)
            sftp.close()

    def exec_command(self, command, timeout=1800, environment=None):
        command = 'set -e\n' + command
        with self as cli:
            chan = cli.get_transport().open_session()
            chan.settimeout(timeout)
            chan.set_combine_stderr(True)
            if environment:
                str_env = ' '.join(f"{k}='{v}'" for k, v in environment.items())
                command = f'export {str_env} && {command}'
            chan.exec_command(command)
            out = chan.makefile("r", -1)
            return chan.recv_exit_status(), out.read()

    def exec_command_with_stream(self, command, timeout=1800, environment=None):
        command = 'set -e\n' + command
        with self as cli:
            chan = cli.get_transport().open_session()
            chan.settimeout(timeout)
            chan.set_combine_stderr(True)
            if environment:
                str_env = ' '.join(f"{k}='{v}'" for k, v in environment.items())
                command = f'export {str_env} && {command}'
            chan.exec_command(command)
            stdout = chan.makefile("r", -1)
            out = stdout.readline()
            while out:
                yield chan.exit_status, out
                out = stdout.readline()
            yield chan.recv_exit_status(), out

    def __enter__(self):
        if self.client is not None:
            raise RuntimeError('Already connected')
        return self.get_client()

    def __exit__(self, exc_type, exc_val, exc_tb):
        self.client.close()
        self.client = None
