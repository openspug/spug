# Copyright: (c) OpenSpug Organization. https://github.com/openspug/spug
# Copyright: (c) <spug.dev@gmail.com>
# Released under the AGPL-3.0 License.
from paramiko.client import SSHClient, AutoAddPolicy
from paramiko.rsakey import RSAKey
from paramiko.ecdsakey import ECDSAKey
from paramiko.ed25519key import Ed25519Key
from paramiko.dsskey import DSSKey
from paramiko.ssh_exception import AuthenticationException, SSHException, PasswordRequiredException  # noqa (re-exported)
from io import StringIO
from uuid import uuid4
import time
import re

# POSIX sh 语法（勿用 bash 专属的 function 关键字），需兼容 dash/ash 等登录 shell
KILLER = '''
kill_tree() {
  local pid=$1
  local and_self=${2:-0}
  local children=$(pgrep -P $pid)
  for child in $children; do
    kill_tree $child 1
  done
  if [ $and_self -eq 1 ]; then
    kill $pid
  fi
}

kill_tree %s
'''


class SSH:
    def __init__(self, hostname, port=22, username='root', pkey=None, password=None, default_env=None,
                 connect_timeout=10, term=None):
        self.client = None
        self.is_windows = False
        self.channel = None
        self.sftp = None
        self.exec_file = f'/tmp/spug.{uuid4().hex}'
        self.term = term or {}
        self.pid = None
        self.eof = 'Spug EOF 2108111926'
        self.default_env = default_env
        self.regex = re.compile(r'(?<!echo )Spug EOF 2108111926 (-?\d+)[\r\n]?')
        self.arguments = {
            'hostname': hostname,
            'port': port,
            'username': username,
            'password': password,
            'pkey': self.load_pkey(pkey),
            'timeout': connect_timeout,
            'allow_agent': False,
            'look_for_keys': False,
            'banner_timeout': 30
        }

    @staticmethod
    def generate_key():
        key_obj = StringIO()
        key = RSAKey.generate(2048)
        key.write_private_key(key_obj)
        return key_obj.getvalue(), 'ssh-rsa ' + key.get_base64()

    @staticmethod
    def load_pkey(pkey):
        if not isinstance(pkey, str):
            return pkey
        last_error = None
        for key_cls in (RSAKey, Ed25519Key, ECDSAKey, DSSKey):
            try:
                return key_cls.from_private_key(StringIO(pkey))
            except PasswordRequiredException:
                raise
            except SSHException as e:
                last_error = e
        raise SSHException(f'unsupported or invalid private key: {last_error}')

    def get_client(self):
        if self.client is not None:
            return self.client
        self.client = SSHClient()
        self.client.set_missing_host_key_policy(AutoAddPolicy)
        self.client.connect(**self.arguments)
        return self.client

    def ping(self):
        self.get_client()
        return True

    def add_public_key(self, public_key):
        command = f'mkdir -p -m 700 ~/.ssh && \
        echo {public_key!r} >> ~/.ssh/authorized_keys && \
        chmod 600 ~/.ssh/authorized_keys'
        exit_code, out = self.exec_command_raw(command)
        if exit_code != 0:
            raise Exception(f'add public key error: {out}')

    def terminate(self, pid):
        command = KILLER % pid
        self.exec_command_raw(command)

    def exec_command_raw(self, command, environment=None):
        self.get_client()
        channel = self.client.get_transport().open_session()
        channel.set_combine_stderr(True)
        if environment:
            # 通过 export 前缀注入而非 update_environment：
            # sshd 默认 AcceptEnv 只放行 LANG/LC_*，其他变量会被服务端静默丢弃
            command = self._make_env_command(environment) + command
        channel.exec_command(command)
        output = b''
        while True:
            data = channel.recv(4096)
            if not data:
                break
            output += data
        return channel.recv_exit_status(), self._decode(output)

    def exec_command(self, command, environment=None):
        channel = self._get_channel()
        command = self._handle_command(command, environment)
        channel.sendall(command)
        buf_size, exit_code, out = 4096, -1, ''
        while True:
            data = channel.recv(buf_size)
            if not data:
                break
            while channel.recv_ready():
                data += channel.recv(buf_size)
            out += self._decode(data)
            match = self.regex.search(out)
            if match:
                exit_code = int(match.group(1))
                out = out[:match.start()]
                break
        return exit_code, out

    def exec_command_with_stream(self, command, environment=None):
        channel = self._get_channel()
        command = self._handle_command(command, environment)
        channel.sendall(command)
        buf_size, exit_code, line = 4096, -1, ''
        while True:
            out = channel.recv(buf_size)
            if not out:
                break
            while channel.recv_ready():
                out += channel.recv(buf_size)
            line = self._decode(out)
            match = self.regex.search(line)
            if match:
                exit_code = int(match.group(1))
                line = line[:match.start()]
                break
            yield exit_code, line
        yield exit_code, line

    def _win_exec_command_with_stream(self, command, environment=None):
        self.get_client()
        channel = self.client.get_transport().open_session()
        if environment:
            channel.update_environment(environment)
        channel.set_combine_stderr(True)
        channel.get_pty(width=102)
        channel.exec_command(command)
        stdout = channel.makefile("rb", -1)
        out = stdout.readline()
        while out:
            yield channel.exit_status, self._decode(out)
            out = stdout.readline()
        yield channel.recv_exit_status(), self._decode(out)

    def put_file(self, local_path, remote_path, callback=None):
        sftp = self._get_sftp()
        sftp.put(local_path, remote_path, callback=callback, confirm=False)

    def put_file_by_fl(self, fl, remote_path, callback=None):
        sftp = self._get_sftp()
        sftp.putfo(fl, remote_path, callback=callback, confirm=False)

    def list_dir_attr(self, path):
        sftp = self._get_sftp()
        return sftp.listdir_attr(path)

    def sftp_stat(self, path):
        sftp = self._get_sftp()
        return sftp.stat(path)

    def remove_file(self, path):
        sftp = self._get_sftp()
        sftp.remove(path)

    def chmod(self, path, mode):
        sftp = self._get_sftp()
        sftp.chmod(path, mode)

    def get_pid(self):
        # Windows 主机无 POSIX 交互通道，取不到远端 pid（调用方需跳过 pid 记录，终止功能降级不可用）
        if self.is_windows:
            return None
        if self.pid:
            return self.pid
        self._get_channel()
        return self.pid

    def _get_channel(self):
        if self.channel:
            return self.channel

        self.get_client()
        self.channel = self.client.invoke_shell(term='xterm', **self.term)
        self.channel.settimeout(3600)
        command = '[ -n "$BASH_VERSION" ] && set +o history\n'
        command += '[ -n "$ZSH_VERSION" ] && set +o zle && set -o no_nomatch && HISTFILE=""\n'
        command += 'export PS1= && stty -echo\n'
        command += f'trap \'rm -f {self.exec_file}*\' EXIT\n'
        command += self._make_env_command(self.default_env)
        command += f'echo {self.eof} $$\n'
        time.sleep(0.2)  # compatibility
        self.channel.sendall(command)
        counter, buf_size = 0, 4096
        while True:
            if self.channel.recv_ready():
                out = self.channel.recv(buf_size)
                if self.channel.recv_ready():
                    out += self.channel.recv(buf_size)
                out = self._decode(out)
                match = self.regex.search(out)
                if match:
                    self.pid = int(match.group(1))
                    if self.pid <= 1:
                        raise Exception('Failed to get process pid')
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

        self.get_client()
        self.sftp = self.client.open_sftp()
        return self.sftp

    def _make_env_command(self, environment):
        if not environment:
            return ''
        str_envs = []
        for k, v in environment.items():
            k = k.replace('-', '_')
            if isinstance(v, str):
                v = v.replace("'", "'\"'\"'")
            str_envs.append(f"{k}='{v}'")
        str_envs = ' '.join(str_envs)
        return f'export {str_envs}\n'

    def _handle_command(self, command, environment):
        new_command = self._make_env_command(environment)
        new_command += command
        new_command += f'\necho {self.eof} $?\n'
        self.put_file_by_fl(StringIO(new_command), self.exec_file)
        return f'. {self.exec_file}\n'

    def _decode(self, content):
        try:
            content = content.decode()
        except UnicodeDecodeError:
            content = content.decode(encoding='GBK', errors='ignore')
        return content

    def __enter__(self):
        self.get_client()
        transport = self.client.get_transport()
        if 'windows' in transport.remote_version.lower():
            self.is_windows = True
            self.exec_command = self.exec_command_raw
            self.exec_command_with_stream = self._win_exec_command_with_stream
        return self

    def __exit__(self, *args, **kwargs):
        self.client.close()
        self.client = None
        self.channel = None
        self.sftp = None
