# Copyright: (c) OpenSpug Organization. https://github.com/openspug/spug
# Copyright: (c) <spug.dev@gmail.com>
# Released under the MIT License.
from django.views.generic import View
from libs import JsonParser, Argument, json_response
from apps.setting.utils import AppSetting
from apps.setting.models import Setting


class SettingView(View):
    def get(self, request):
        settings = Setting.objects.exclude(key__in=('public_key', 'private_key'))
        return json_response(settings)

    def post(self, request):
        form, error = JsonParser(
            Argument('data', type=list, help='缺少必要的参数')
        ).parse(request.body)
        if error is None:
            for item in form.data:
                AppSetting.set(**item)
        return json_response(error=error)
