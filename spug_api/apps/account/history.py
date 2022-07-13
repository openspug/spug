# Copyright: (c) OpenSpug Organization. https://github.com/openspug/spug
# Copyright: (c) <spug.dev@gmail.com>
# Released under the AGPL-3.0 License.
from libs.mixins import AdminView
from libs import json_response
from apps.account.models import History


class HistoryView(AdminView):
    def get(self, request):
        histories = History.objects.all()
        return json_response(histories)
