# Copyright: (c) OpenSpug Organization. https://github.com/openspug/spug
# Copyright: (c) <spug.dev@gmail.com>
# Released under the AGPL-3.0 License.
import socket
import requests
from time import sleep
from datetime import datetime


class HealthCheck:

    def __init__(self, host, host_id=None, helper=None, url=None, is_https=False, **kwargs):
        self.host = host
        self.port = kwargs['check_port']
        self.retry = kwargs['check_retry']
        self.path = kwargs['check_path']
        self.timeout = kwargs['check_timeout']
        self.interval = kwargs['check_interval']
        self.is_http_check = kwargs['is_http_check']
        if not url and self.is_http_check:
            self.url = "{protocol}://{host}:{port}{path}".format(
                protocol="https" if is_https else "http",
                host=self.host,
                port=self.port,
                path=self.path if self.path.startswith('/') else '/'+self.path
            )
        else:
            self.url = url
        self.host_id = host_id
        self.helper = helper

    def notify(self, message):
        if self.helper:
            self.helper.send_step(self.host_id, 4, "{} {} \r\n".format(datetime.now().strftime('%H:%M:%S'), message))
        else:
            print(message)

    def is_health(self) -> bool:
        if self.is_http_check:
            return self.health_check_with_http()
        else:
            return self.health_check_with_tcp()

    def health_check_with_tcp(self) -> bool:
        for i in range(self.retry):
            self.notify("第{}次TCP健康检查".format(i+1))
            if self.is_tcp_can_connect():
                return True
            if i < self.retry-1:
                sleep(self.interval)
        return False

    def health_check_with_http(self) -> bool:
        for i in range(self.retry):
            self.notify("第{}次HTTP健康检查".format(i+1))
            if self.is_http_status_in_2xx_3xx():
                return True
            if i < self.retry-1:
                sleep(self.interval)
        return False

    def is_tcp_can_connect(self) -> bool:
        s = socket.socket()
        s.settimeout(self.timeout)
        try:
            s.connect((self.host, self.port))
            self.notify("第TCP健康检查:{}:{} Connected".format(self.host, self.port))
            s.close()
            return True
        except socket.error as e:
            self.notify("TCP健康检查:{}:{} --- {}".format(self.host, self.port, e))
            return False

    def is_http_status_in_2xx_3xx(self) -> bool:
        try:
            resp = requests.get(self.url, timeout=self.timeout)
            self.notify("HTTP健康检查：{} status_code:{}".format(self.url, resp.status_code))
            # 判断是否2xx 3xx
            return 200 >= resp.status_code <= 399
        except requests.exceptions.RequestException as e:
            self.notify("HTTP健康检查：{} --- {}".format(self.url, e))
            return False


