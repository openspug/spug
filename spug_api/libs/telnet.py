# Copyright: (c) OpenSpug Organization. https://github.com/openspug/spug
# Copyright: (c) <spug.dev@gmail.com>
# Released under the AGPL-3.0 License.
import telnetlib
import time

class AuthenticationException(Exception):
    pass

class Telnet:
    def __init__(self, hostname, port, username, password, timeout=10):
        self.hostname = hostname
        self.port = port
        self.username = username
        self.password = password
        self.timeout = timeout
        self._tn = None

    def __enter__(self):
        self.connect()
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        self.close()

    def connect(self):
        try:
            self._tn = telnetlib.Telnet(self.hostname, self.port, self.timeout)
            
            # 等待登录提示
            index, match, text = self._tn.expect([b"login:", b"username:", b"Username:"], self.timeout)
            if index != -1:
                self._tn.write(self.username.encode('ascii') + b'\n')
                
                # 等待密码提示
                index, match, text = self._tn.expect([b"Password:", b"password:"], self.timeout)
                if index != -1:
                    self._tn.write(self.password.encode('ascii') + b'\n')
                    
                    # 验证登录结果
                    index, match, text = self._tn.expect([b"#", b"$", b">"], self.timeout)
                    if index == -1:
                        raise AuthenticationException("Authentication failed")
                else:
                    raise AuthenticationException("Password prompt not found")
            else:
                raise AuthenticationException("Login prompt not found")
        except:
            if self._tn:
                self.close()
            raise

    def exec_command(self, command):
        """执行命令并返回结果"""
        if not self._tn:
            raise RuntimeError("Not connected")
            
        try:
            self._tn.write(command.encode('ascii') + b'\n')
            time.sleep(0.5)  # 等待命令执行
            
            # 读取命令输出直到提示符
            response = self._tn.read_until(b"#", self.timeout)
            return 0, response.decode('ascii')
        except:
            return 1, None

    def close(self):
        """关闭连接"""
        if self._tn:
            self._tn.close()
            self._tn = None
