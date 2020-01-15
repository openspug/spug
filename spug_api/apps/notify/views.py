from django.views.generic import View
from apps.notify.models import Notify
from libs import json_response, JsonParser, Argument


class NotifyView(View):
    def get(self, request):
        notifies = Notify.objects.filter(unread=True)
        return json_response(notifies)

    def patch(self, request):
        form, error = JsonParser(
            Argument('id', type=int, help='参数错误')
        ).parse(request.body)
        if error is None:
            Notify.objects.filter(pk=form.id).update(unread=False)
        return json_response(error=error)
