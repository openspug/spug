# Copyright: (c) OpenSpug Organization. https://github.com/openspug/spug
# Released under the MIT License.
from apps.alarm.models import Alarm
from datetime import datetime, timedelta


def auto_clean_records():
    date = datetime.now() - timedelta(days=30)
    Alarm.objects.filter(created_at__lt=date.strftime('%Y-%m-%d')).delete()
