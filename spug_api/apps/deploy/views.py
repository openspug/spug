from django.views.generic import View
from django.db.models import F
from libs import json_response, JsonParser, Argument
from apps.deploy.models import DeployRequest
from apps.app.models import App
import json


class RequestView(View):
    def get(self, request):
        data = []
        for item in DeployRequest.objects.annotate(
                env_name=F('app__env__name'),
                app_name=F('app__name'),
                app_host_ids=F('app__host_ids'),
                app_extend=F('app__extend'),
                created_by_user=F('created_by__nickname')):
            tmp = item.to_dict()
            tmp['env_name'] = item.env_name
            tmp['app_name'] = item.app_name
            tmp['app_extend'] = item.app_extend
            tmp['extra'] = json.loads(item.extra)
            tmp['host_ids'] = json.loads(item.host_ids)
            tmp['app_host_ids'] = json.loads(item.app_host_ids)
            tmp['status_alias'] = item.get_status_display()
            tmp['created_by_user'] = item.created_by_user
            data.append(tmp)
        return json_response(data)

    def post(self, request):
        form, error = JsonParser(
            Argument('id', type=int, required=False),
            Argument('app_id', type=int, help='缺少必要参数'),
            Argument('name', help='请输申请标题'),
            Argument('extra', type=list, help='缺少必要参数'),
            Argument('host_ids', type=list, filter=lambda x: len(x), help='请选择要部署的主机'),
            Argument('desc', required=False),
        ).parse(request.body)
        if error is None:
            app = App.objects.filter(pk=form.app_id).first()
            if not app:
                return json_response(error='未找到该应用')
            form.status = '1' if app.is_audit else '2'
            form.extra = json.dumps(form.extra)
            form.host_ids = json.dumps(form.host_ids)
            if form.id:
                DeployRequest.objects.filter(pk=form.id).update(
                    created_by=request.user,
                    reason=None,
                    **form
                )
            else:
                DeployRequest.objects.create(created_by=request.user, **form)
        return json_response(error=error)
