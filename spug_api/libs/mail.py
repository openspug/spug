from email.header import Header
from email.mime.text import MIMEText
from email.utils import formataddr
import smtplib


class Mail:
    def __init__(self, server, port, username, password, nickname=None):
        self.host = server
        self.port = int(port)
        self.user = username
        self.password = password
        self.nickname = nickname

    def get_server(self):
        if self.port == 465:
            server = smtplib.SMTP_SSL(self.host, self.port)
        elif self.port == 587:
            server = smtplib.SMTP(self.host, self.port)
            server.ehlo()
            server.starttls()
        else:
            server = smtplib.SMTP(self.host, self.port)
        server.login(self.user, self.password)
        return server

    def send_text_mail(self, receivers, subject, body):
        server = self.get_server()
        msg = MIMEText(body, 'plain', 'utf-8')
        msg['Subject'] = Header(subject, 'utf-8')
        msg['From'] = formataddr((self.nickname, self.user)) if self.nickname else self.user
        server.sendmail(self.user, receivers, msg.as_string())
        server.quit()
