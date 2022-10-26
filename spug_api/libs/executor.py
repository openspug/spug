from libs.utils import str_decode
import subprocess
import re
import os


class Executor:
    def __init__(self, default_env=None):
        self.regex = re.compile(r'(?<!echo )Spug EOF 2108111926 (-?\d+)[\r\n]?')
        self.default_env = default_env
        self.task = None

    @property
    def pid(self):
        if self.task:
            return self.task.pid
        return None

    def get_envs(self):
        envs = {}
        _, output = self.exec_command('env | grep SPUG_GEV_')
        if output:
            for item in output.splitlines():
                if '=' in item:
                    key, val = item.split('=', 1)
                    envs[key] = val
        return envs

    def exec_command_with_stream(self, command):
        command += '\necho Spug EOF 2108111926 $?\n'
        self.task.stdin.write(command.encode())
        self.task.stdin.flush()
        exit_code, message,  = -1, b''
        while True:
            output = self.task.stdout.read(1)
            if not output:
                exit_code, message = self.task.wait(), ''
                break
            if output in (b'\r', b'\n'):
                message += b'\r\n' if output == b'\n' else b'\r'
                message = str_decode(message)
                match = self.regex.search(message)
                if match:
                    exit_code = int(match.group(1))
                    message = message[:match.start()]
                    break
                yield exit_code, message
                message = b''
            else:
                message += output
        yield exit_code, message

    def exec_command(self, command):
        exit_code, message = -1, ''
        for exit_code, line in self.exec_command_with_stream(command):
            message += line
        return exit_code, message

    def __enter__(self):
        self.task = subprocess.Popen(
            'bash',
            env=self.default_env,
            shell=True,
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            preexec_fn=os.setsid
        )
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        if self.task:
            self.task.kill()
