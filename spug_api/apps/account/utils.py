# Copyright: (c) OpenSpug Organization. https://github.com/openspug/spug
# Released under the AGPL-3.0 License.
from apps.account.models import History
from datetime import datetime, timedelta


def auto_clean_login_history():
    date = datetime.now() - timedelta(days=30)
    History.objects.filter(created_at__lt=date.strftime('%Y-%m-%d')).delete()
