# Copyright: (c) OpenSpug Organization. https://github.com/openspug/spug
# Copyright: (c) <spug.dev@gmail.com>
# Released under the MIT License.
from django.views.generic import View
from apps.notify.models import Notify
from libs import json_response, JsonParser, Argument


class NotifyView(View):
    def get(self, request):
        notifies = Notify.objects.filter(unread=True)
        return json_response(notifies)

    def patch(self, request):
        form, error = JsonParser(
            Argument('ids', type=list, help='参数错误')
        ).parse(request.body)
        if error is None:
            Notify.objects.filter(id__in=form.ids).update(unread=False)
        return json_response(error=error)
