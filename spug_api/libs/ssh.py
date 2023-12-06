# Copyright: (c) OpenSpug Organization. https://github.com/openspug/spug
# Copyright: (c) <spug.dev@gmail.com>
# Released under the AGPL-3.0 License.
from paramiko.client import SSHClient, AutoAddPolicy
from paramiko.rsakey import RSAKey
from paramiko.ssh_exception import AuthenticationException
from io import StringIO
from uuid import uuid4
import time
import re

KILLER = '''
function kill_tree {
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
    def __init__(self, host, credential, environment=None):
        self.client = None
        self.channel = None
        self.sftp = None
        self.exec_file = f'/tmp/spug.{uuid4().hex}'
        self.pid = None
        self.environment = environment
        self.eof = 'Spug EOF 2108111926'
        self.regex = re.compile(r'(?<!echo )Spug EOF 2108111926 (-?\d+)[\r\n]?')
        self.arguments = {
            'hostname': host.hostname,
            'port': host.port,
            'username': credential.username,
            'allow_agent': False,
            'look_for_keys': False,
        }
        if credential.type == 'pw':
            self.arguments['password'] = credential.secret
        elif credential.type == 'pk':
            self.arguments['pkey'] = RSAKey.from_private_key(StringIO(credential.secret))
        else:
            raise Exception('Invalid credential type for SSH')

    def exec_command(self, command, environment=None):
        command = self._handle_command(command, environment)
        self.channel.sendall(command)
        buf_size, exit_code, out = 4096, -1, ''
        while True:
            data = self.channel.recv(buf_size)
            if not data:
                break
            while self.channel.recv_ready():
                data += self.channel.recv(buf_size)
            out += self._decode(data)
            match = self.regex.search(out)
            if match:
                exit_code = int(match.group(1))
                out = out[:match.start()]
                break
        return exit_code, out

    def exec_command_with_stream(self, command, environment=None):
        command = self._handle_command(command, environment)
        self.channel.sendall(command)
        buf_size, exit_code, line = 4096, -1, ''
        while True:
            out = self.channel.recv(buf_size)
            if not out:
                break
            while self.channel.recv_ready():
                out += self.channel.recv(buf_size)
            line = self._decode(out)
            match = self.regex.search(line)
            if match:
                exit_code = int(match.group(1))
                line = line[:match.start()]
                break
            yield exit_code, line
        yield exit_code, line

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

    def terminate(self, pid):
        command = KILLER % pid
        self.exec_command(command)

    def _initial(self):
        self.client = SSHClient()
        self.client.set_missing_host_key_policy(AutoAddPolicy)
        self.client.connect(**self.arguments)

        self.channel = self.client.invoke_shell(term='xterm')
        self.channel.settimeout(3600)
        command = '[ -n "$BASH_VERSION" ] && set +o history\n'
        command += '[ -n "$ZSH_VERSION" ] && set +o zle && HISTFILE=\n'
        command += 'export PS1= && stty -echo\n'
        command += f'trap \'rm -f {self.exec_file}*\' EXIT\n'
        command += self._make_env_command(self.environment)
        command += f'echo {self.eof} $$\n'
        time.sleep(0.2)  # compatibility
        self.channel.sendall(command.encode())
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
                    self.stdout = self.channel.makefile('r')
                    break
            elif counter >= 100:
                self.client.close()
                raise Exception('Wait spug response timeout')
            else:
                counter += 1
                time.sleep(0.1)

    def _get_sftp(self):
        if self.sftp:
            return self.sftp

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
        self._initial()
        return self

    def __exit__(self, *args, **kwargs):
        self.channel.close()
        self.client.close()
        self.client = None
