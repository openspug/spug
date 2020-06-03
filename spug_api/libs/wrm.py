# Copyright: (c) OpenSpug Organization. https://github.com/openspug/spug
# Copyright: (c) <spug.dev@gmail.com>
# Released under the MIT License.
import winrm
#windows主机使用winrm进行远程控制，使用账户密码链接(不生成发送密钥)

class Winrm:
    def __init__(self, hostname, port=5985, username='administrator', password=None):
        self.client = None
        self.hostname = hostname
        self.port = port
        self.username = username
        self.password = password
                

    def ping(self):
        with self:
            return True

    def get_client(self):
        if self.client is not None:
            return self.client
        connect_str = "http://%s:%d/wsman" % (self.hostname,self.port)
        self.client = winrm.Session(connect_str,auth = (self.username,self.password))
        return self.client


    def exec_command(self, command):
        with self as cli:
            exec_result = cli.run_cmd(command)
            return exec_result.status_code, exec_result.std_out

    #执行powershell脚本
    def exec_ps(self,ps):
        with self as cli:
            exec_result = cli.run_ps(ps)
            return exec_result.status_code,exec_result.std_out


    #def exec_command_with_stream(self, command, timeout=1800, environment=None):
    #    with self as cli:
    #        chan = cli.get_transport().open_session()
    #        chan.settimeout(timeout)
    #        chan.set_combine_stderr(True)
    #        if environment:
    #            str_env = ' '.join(f"{k}='{v}'" for k, v in environment.items())
    #            command = f'export {str_env} && {command}'
    #        chan.exec_command(command)
    #        stdout = chan.makefile("r", -1)
    #        out = stdout.readline()
    #        while out:
    #            yield chan.exit_status, out
    #            out = stdout.readline()
    #        yield chan.recv_exit_status(), out


    def __enter__(self):
        if self.client is not None:
            raise RuntimeError('Already connected')
        return self.get_client()

    def __exit__(self, exc_type, exc_val, exc_tb):
        pass
        #self.client.close()
        #self.client = None
