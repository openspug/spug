# Copyright: (c) OpenSpug Organization. https://github.com/openspug/spug
# Copyright: (c) <spug.dev@gmail.com>
# Released under the AGPL-3.0 License.
from django.views.generic import View
from apps.domain.models import Domain
from libs import json_response, JsonParser, Argument

class DomainView(View):
    def get(self, request):
        domains = Domain.objects.all()
        return json_response(domains)

    def post(self, request):
        form, error = JsonParser(
            Argument('id', type=int, required=False),
            Argument('name', help='请输入域名名称'),
            Argument('domain_name', help='请输入检查证书信息的域名'),
            Argument('alarm_day', help='剩余多少天开始通知，默认30天'),
            Argument('is_active', type=bool, help='域名是否生效'),
            Argument('desc', required=False, default='')
        ).parse(request.body)
        if error is None:
            domain = Domain.objects.filter(name=form.name).first()
            if domain and domain.id != form.id:
                return json_response(error=f'域名 {form.name} 已存在，请更改后重试')
            if form.id:
                Domain.objects.filter(pk=form.id).update(**form)
            else:
                Domain.objects.create(**form)
        return json_response(error=error)

    def delete(self, request):
        form, error = JsonParser(
            Argument('id', type=int, help='请指定操作对象')
        ).parse(request.GET)
        if error is None:
            domain = Domain.objects.filter(pk=form.id).first()
            if domain:
                domain.delete()

        return json_response(error=error)



