from email.header import Header
from email.mime.text import MIMEText
from email.utils import formataddr, formatdate, make_msgid
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
        # 过滤空地址：Contact.email 可能是空字符串（不是 NULL），
        # 带着空收件人调用 sendmail 会被服务端整封拒收
        receivers = [x.strip() for x in receivers if x and x.strip()]
        if not receivers:
            raise ValueError('没有有效的收件人邮箱地址')

        msg = MIMEText(body, 'plain', 'utf-8')
        msg['Subject'] = Header(subject, 'utf-8')
        msg['From'] = formataddr((self.nickname, self.user)) if self.nickname else self.user
        # To/Date/Message-ID 是缺一不可的标准头部：缺失时 Gmail、Outlook 等
        # 会直接判为垃圾邮件甚至静默丢弃（SMTP 层面仍返回成功，很难察觉）
        msg['To'] = ', '.join(receivers)
        msg['Date'] = formatdate(localtime=True)
        msg['Message-ID'] = make_msgid(domain=self.user.split('@')[-1] or None)

        server = self.get_server()
        try:
            server.sendmail(self.user, receivers, msg.as_string())
        finally:
            try:
                server.quit()
            except Exception:
                # 发送已完成时连接可能已被服务端关闭，quit 失败不应掩盖真实结果
                pass
