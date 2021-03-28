# Copyright: (c) OpenSpug Organization. https://github.com/openspug/spug
# Copyright: (c) <spug.dev@gmail.com>
# Released under the AGPL-3.0 License.
from django.views.generic import View
from libs import json_response, JsonParser, Argument
from apps.home.models import Notice
import json


class NoticeView(View):
    def get(self, request):
        notices = Notice.objects.all()
        return json_response([x.to_view() for x in notices])

    def post(self, request):
        form, error = JsonParser(
            Argument('id', type=int, required=False),
            Argument('title', help='请输入标题'),
            Argument('content', help='请输入内容'),
            Argument('is_stress', type=bool, default=False),
        ).parse(request.body)
        if error is None:
            if form.is_stress:
                Notice.objects.update(is_stress=False)
            if form.id:
                Notice.objects.filter(pk=form.id).update(**form)
            else:
                notice = Notice.objects.create(**form)
                notice.sort_id = notice.id
                notice.save()
        return json_response(error=error)

    def patch(self, request):
        form, error = JsonParser(
            Argument('id', type=int, help='参数错误'),
            Argument('sort', filter=lambda x: x in ('up', 'down'), required=False),
            Argument('read', required=False)
        ).parse(request.body)
        if error is None:
            notice = Notice.objects.filter(pk=form.id).first()
            if not notice:
                return json_response(error='未找到指定记录')
            if form.sort:
                if form.sort == 'up':
                    tmp = Notice.objects.filter(sort_id__gt=notice.sort_id).last()
                else:
                    tmp = Notice.objects.filter(sort_id__lt=notice.sort_id).first()
                if tmp:
                    tmp.sort_id, notice.sort_id = notice.sort_id, tmp.sort_id
                    tmp.save()
            if form.read:
                read_ids = json.loads(notice.read_ids)
                read_ids.append(str(request.user.id))
                notice.read_ids = json.dumps(read_ids)
            notice.save()
        return json_response(error=error)

    def delete(self, request):
        form, error = JsonParser(
            Argument('id', type=int, help='参数错误')
        ).parse(request.GET)
        if error is None:
            Notice.objects.filter(pk=form.id).delete()
        return json_response(error=error)
