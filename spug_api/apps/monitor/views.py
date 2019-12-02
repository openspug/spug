from django.views.generic import View
from libs import json_response, JsonParser, Argument, human_time
from apps.monitor.models import Detection


class DetectionView(View):
    def get(self, request):
        detections = Detection.objects.all()
        return json_response(detections)

    def post(self, request):
        form, error = JsonParser(
            Argument('id', type=int, required=False),
            Argument('name', help='请输入任务名称'),
            Argument('addr', help='请输入监控地址'),
            Argument('type', filter=lambda x: x in dict(Detection.TYPES), help='请选择监控类型'),
            Argument('extra', required=False),
            Argument('desc', required=False),
            Argument('rate', type=int, default=5),
            Argument('threshold', type=int, default=3),
            Argument('quiet', type=int, default=24 * 60)
        ).parse(request.body)
        if error is None:
            if form.id:
                form.updated_at = human_time()
                form.updated_by = request.user
                Detection.objects.filter(pk=form.pop('id')).update(**form)
            else:
                form.created_by = request.user
                Detection.objects.create(**form)
        return json_response(error=error)

    def delete(self, request):
        form, error = JsonParser(
            Argument('id', type=int, help='请指定操作对象')
        ).parse(request.GET)
        if error is None:
            Detection.objects.filter(pk=form.id).delete()
        return json_response(error=error)
