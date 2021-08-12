# Copyright: (c) OpenSpug Organization. https://github.com/openspug/spug
# Copyright: (c) <spug.dev@gmail.com>
# Released under the AGPL-3.0 License.
from paramiko.client import SSHClient, AutoAddPolicy
from paramiko.rsakey import RSAKey
from paramiko.ssh_exception import AuthenticationException
from io import StringIO
import time
import re


class SSH:
    def __init__(self, hostname, port=22, username='root', pkey=None, password=None, default_env=None,
                 connect_timeout=10):
        self.stdout = None
        self.client = None
        self.channel = None
        self.sftp = None
        self.eof = 'Spug EOF 2108111926'
        self.default_env = self._make_env_command(default_env)
        self.regex = re.compile(r'Spug EOF 2108111926 -?\d+[\r\n]?$')
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

    def get_client(self):
        if self.client is not None:
            return self.client
        self.client = SSHClient()
        self.client.set_missing_host_key_policy(AutoAddPolicy)
        self.client.connect(**self.arguments)
        return self.client

    def ping(self):
        return True

    def add_public_key(self, public_key):
        command = f'mkdir -p -m 700 ~/.ssh && \
        echo {public_key!r} >> ~/.ssh/authorized_keys && \
        chmod 600 ~/.ssh/authorized_keys'
        exit_code, out = self.exec_command_raw(command)
        if exit_code != 0:
            raise Exception(f'add public key error: {out}')

    def exec_command_raw(self, command):
        channel = self.client.get_transport().open_session()
        try:
            channel.set_combine_stderr(True)
            channel.exec_command(command)
            return channel.recv_exit_status(), channel.recv(-1).decode()
        finally:
            channel.close()

    def exec_command(self, command, environment=None):
        channel = self._get_channel()
        command = self._handle_command(command, environment)
        channel.send(command)
        out, exit_code = '', -1
        for line in self.stdout:
            if self.regex.search(line):
                exit_code = int(line.rsplit()[-1])
                break
            out += line
        return exit_code, out

    def exec_command_with_stream(self, command, environment=None):
        channel = self._get_channel()
        command = self._handle_command(command, environment)
        channel.send(command)
        exit_code, line = -1, ''
        while True:
            line = channel.recv(8196).decode()
            print(repr(line))
            match = self.regex.search(line)
            if match:
                exit_code = int(line.rsplit()[-1])
                line = line[:match.start()]
                break
            yield exit_code, line
        yield exit_code, line

    def put_file(self, local_path, remote_path):
        sftp = self._get_sftp()
        sftp.put(local_path, remote_path)

    def put_file_by_fl(self, fl, remote_path, callback=None):
        sftp = self._get_sftp()
        sftp.putfo(fl, remote_path, callback=callback)

    def list_dir_attr(self, path):
        sftp = self._get_sftp()
        return sftp.listdir_attr(path)

    def remove_file(self, path):
        sftp = self._get_sftp()
        sftp.remove(path)

    def _get_channel(self):
        if self.channel:
            return self.channel

        counter = 0
        self.channel = self.client.invoke_shell()
        command = 'export PS1= && stty -echo'
        if self.default_env:
            command += f' && {self.default_env}'
        command += f' && echo {self.eof} $?\n'
        self.channel.send(command.encode())
        while True:
            if self.channel.recv_ready():
                line = self.channel.recv(8196).decode()
                if self.regex.search(line):
                    self.stdout = self.channel.makefile('r')
                    break
            elif counter >= 100:
                self.client.close()
                raise Exception('Wait spug response timeout')
            else:
                counter += 1
                time.sleep(0.1)
        return self.channel

    def _get_sftp(self):
        if self.sftp:
            return self.sftp

        self.sftp = self.client.open_sftp()
        return self.sftp

    def _break(self):
        time.sleep(5)
        command = f'\x03 echo {self.eof} -1\n'
        self.channel.send(command.encode())

    def _make_env_command(self, environment):
        if not environment:
            return None
        str_envs = []
        for k, v in environment.items():
            k = k.replace('-', '_')
            if isinstance(v, str):
                v = v.replace("'", "'\"'\"'")
            str_envs.append(f"{k}='{v}'")
        str_envs = ' '.join(str_envs)
        return f'export {str_envs}'

    def _handle_command(self, command, environment):
        commands = list()
        commands.append(self._make_env_command(environment))
        commands.append(command.strip('\n'))
        commands.append(f'echo {self.eof} $?\n')
        return '\n'.join(x for x in commands if x).encode()

    def __enter__(self):
        self.get_client()
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        self.client.close()
        self.client = None
