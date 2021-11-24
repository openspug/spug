# Copyright: (c) OpenSpug Organization. https://github.com/openspug/spug
# Copyright: (c) <spug.dev@gmail.com>
# Released under the AGPL-3.0 License.
from django.views.generic import View
from django.db.models import F
from libs import json_response, auth
from apps.account.models import History


class HistoryView(View):
    @auth('dashboard.dashboard.view')
    def get(self, request):
        histories = []
        for item in History.objects.annotate(nickname=F('user__nickname')):
            histories.append({
                'nickname': item.nickname,
                'ip': item.ip,
                'created_at': item.created_at.split('-', 1)[1],
            })
        return json_response(histories)
