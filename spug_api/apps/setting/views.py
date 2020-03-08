# Copyright: (c) OpenSpug Organization. https://github.com/openspug/spug
# Copyright: (c) <spug.dev@gmail.com>
# Released under the MIT License.
from django.views.generic import View
from libs import JsonParser, Argument, json_response
from apps.setting.utils import AppSetting
from apps.setting.models import Setting
import ldap


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


def ldap_test(request):
    form, error = JsonParser(
        Argument('server'),
        Argument('port', type=int),
        Argument('admin_dn'),
        Argument('password'),
    ).parse(request.body)
    if error is None:
        try:
            con = ldap.initialize("ldap://{0}:{1}".format(form.server, form.port), bytes_mode=False)
            con.simple_bind_s(form.admin_dn, form.password)
            return json_response()
        except Exception as e:
            error = eval(str(e))
            return json_response(error=error['desc'])
    return json_response(error=error)




