# Copyright: (c) OpenSpug Organization. https://github.com/openspug/spug
# Copyright: (c) <spug.dev@gmail.com>
# Released under the AGPL-3.0 License.
from django.views.generic import View
from libs import JsonParser, Argument, json_response
from apps.setting.models import UserSetting


class UserSettingView(View):
    def get(self, request):
        response = {}
        for item in UserSetting.objects.filter(user=request.user):
            response[item.key] = item.value
        return json_response(response)

    def post(self, request):
        form, error = JsonParser(
            Argument('key', help='参数错误'),
            Argument('value', help='参数错误'),
        ).parse(request.body)
        if error is None:
            UserSetting.objects.update_or_create(
                user=request.user,
                key=form.key,
                defaults={'value': form.value}
            )
            return self.get(request)
        return json_response(error=error)
