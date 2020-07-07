# Copyright: (c) OpenSpug Organization. https://github.com/openspug/spug
# Copyright: (c) <spug.dev@gmail.com>
# Released under the AGPL-3.0 License.

import whois
from whois.exceptions import *
import time
from datetime import datetime
import ssl, socket
from apps.domain.models import Domain
from apps.notify.models import Notify


def domain_cret_cron_job():
    for domain in Domain.objects.filter(is_active=1).all():
        check_domain_info(domain, 0)
        check_domain_cret(domain, 0)


def check_domain_info(domain, n):
    try:
        info = whois.query(domain.domain_name)
    except (FailedParsingWhoisOutput, WhoisCommandFailed):
        if  n < 3:
            n = n + 1
            check_domain_info(domain, n)

        if n >= 3:
            Notify.make_notify('schedule', '1', "域名信息检查异常", "域名" + domain.domain_name + "有效性检查异常,请检查网络！")
            return

    str_domain_end_time = info.expiration_date.strftime('%Y-%m-%d %H:%M:%S')
    ts_domain_end_time = time.mktime(time.strptime(str_domain_end_time, "%Y-%m-%d %H:%M:%S"))
    alarm_notify(ts_domain_end_time, 1, domain)

    if str_domain_end_time != domain.domain_end_time:
        Domain.objects.filter(pk=domain.id).update(domain_end_time=str_domain_end_time)

def check_domain_cret(domain, n):
    ctx = ssl.create_default_context()
    s = ctx.wrap_socket(socket.socket(), server_hostname=domain.domain_name)

    try:
        s.connect((domain.domain_name, 443))
    except:
        if  n < 3:
            n = n + 1
            check_domain_cret(domain, n)

        if n >= 3:
            Notify.make_notify('schedule', '1', "证书信息检查异常", "域名" + domain.domain_name + "的https证书有效性检查异常,请检查网络！")
            return

    info = s.getpeercert()
    notAfter = info['notAfter']
    date_object = datetime.strptime(notAfter, '%b %d %H:%M:%S %Y %Z')
    str_cert_end_time = date_object.strftime('%Y-%m-%d %H:%M:%S')
    ts_cert_end_time = time.mktime(time.strptime(str_cert_end_time, "%Y-%m-%d %H:%M:%S"))
    alarm_notify(ts_cert_end_time, 2, domain)

    if str_cert_end_time != domain.cert_end_time:
        Domain.objects.filter(pk=domain.id).update(cert_end_time=str_cert_end_time)

def alarm_notify(end_ts, type, domain):
    ts = time.time()
    if (end_ts - ts) < domain.alarm_day * 86400:
        if type == 1:
            title="域名续费提醒"
            msg = "你的域名" + domain.domain_name + "有效期少于" + domain.alarm_day + "天，请及时安排续费！"

        if type == 2:
            title="域名证书续签提醒"
            msg = "域名" + domain.domain_name + "的https证书有效期少于" + domain.alarm_day + "天，请及时安排续签！"

        # 平台 notify
        Notify.make_notify('schedule', '1', title, msg)
