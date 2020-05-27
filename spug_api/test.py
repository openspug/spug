from email.message import EmailMessage
from email.utils import formataddr
import smtplib


class Mail:
    def __init__(self, server, port, username, password, nickname=None):
        self.host = server
        self.port = port
        self.user = username
        self.password = password
        self.nickname = nickname

    def _get_server(self):
        print(self.host, self.port, self.user, self.password)
        server = smtplib.SMTP_SSL(self.host, self.port)
        server.login(self.user, self.password)
        return server

    def send_text_mail(self, to_addrs, subject, body):
        if isinstance(to_addrs, (list, tuple)):
            to_addrs = ', '.join(to_addrs)
        server = self._get_server()
        msg = EmailMessage()
        msg.set_content(body)
        msg['Subject'] = subject
        msg['From'] = formataddr((self.nickname, self.user)) if self.nickname else self.user
        msg['To'] = to_addrs
        server.send_message(msg)
        server.quit()

mail_service = {'server': 'smtp.163.com', 'port': '465', 'username': 'leiem1989@163.com', 'password': 'FOCCUIGOCTJGCBOB', 'nickname': 'spug'}
mail = Mail(**mail_service)
mail.send_text_mail({'live1989@foxmail.com'}, '恢复-官网检测', f'恢复-官网检测\r\n\r\n自动发送，请勿回复。')