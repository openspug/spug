from django.views.generic import View
from libs import json_response, JsonParser, Argument
from apps.deploy.models import DeployRequest
import json


class RequestView(View):
    def get(self, request):
        requests = DeployRequest.objects.all()
        return json_response(requests)

    def post(self, request):
        form, error = JsonParser(
            Argument('name', help='请输申请标题'),
            Argument('extra1', help='缺少必要参数'),
            Argument('extra2', help='缺少必要参数'),
            Argument('host_ids', type=list, filter=lambda x: len(x), help='请选择要部署的主机'),
            Argument('desc', required=False),
        ).parse(request.body)
        if error is None:
            form.host_ids = json.dumps(form.host_ids)
            DeployRequest.objects.create(**form)
        return json_response(error=error)
