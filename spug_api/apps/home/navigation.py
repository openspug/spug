# Copyright: (c) OpenSpug Organization. https://github.com/openspug/spug
# Copyright: (c) <spug.dev@gmail.com>
# Released under the AGPL-3.0 License.
from django.views.generic import View
from libs import json_response, JsonParser, Argument
from apps.home.models import Navigation
import json


class NavView(View):
    def get(self, request):
        navs = Navigation.objects.all()
        return json_response([x.to_view() for x in navs])

    def post(self, request):
        form, error = JsonParser(
            Argument('id', type=int, required=False),
            Argument('title', help='请输入导航标题'),
            Argument('desc', help='请输入导航描述'),
            Argument('logo', help='请上传导航logo'),
            Argument('links', type=list, filter=lambda x: len(x), help='请设置导航链接'),
        ).parse(request.body)
        if error is None:
            form.links = json.dumps(form.links)
            if form.id:
                Navigation.objects.filter(pk=form.id).update(**form)
            else:
                nav = Navigation.objects.create(**form)
                nav.sort_id = nav.id
                nav.save()
        return json_response(error=error)

    def patch(self, request):
        form, error = JsonParser(
            Argument('id', type=int, help='参数错误'),
            Argument('sort', filter=lambda x: x in ('up', 'down'), required=False),
        ).parse(request.body)
        if error is None:
            nav = Navigation.objects.filter(pk=form.id).first()
            if not nav:
                return json_response(error='未找到指定记录')
            if form.sort:
                if form.sort == 'up':
                    tmp = Navigation.objects.filter(sort_id__gt=nav.sort_id).last()
                else:
                    tmp = Navigation.objects.filter(sort_id__lt=nav.sort_id).first()
                if tmp:
                    tmp.sort_id, nav.sort_id = nav.sort_id, tmp.sort_id
                    tmp.save()
            nav.save()
        return json_response(error=error)

    def delete(self, request):
        form, error = JsonParser(
            Argument('id', type=int, help='参数错误')
        ).parse(request.GET)
        if error is None:
            Navigation.objects.filter(pk=form.id).delete()
        return json_response(error=error)
