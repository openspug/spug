# Copyright: (c) OpenSpug Organization. https://github.com/openspug/spug
# Copyright: (c) <spug.dev@gmail.com>
# Released under the AGPL-3.0 License.
from django.views.generic import View
from django.db.models import F
from django.conf import settings
from libs import json_response, JsonParser, Argument
from apps.repository.models import Repository
from apps.deploy.models import DeployRequest
from apps.repository.utils import dispatch
from apps.app.models import Deploy
from threading import Thread
import json
import os


class RepositoryView(View):
    def get(self, request):
        deploy_id = request.GET.get('deploy_id')
        data = Repository.objects.annotate(
            app_name=F('app__name'),
            env_name=F('env__name'),
            created_by_user=F('created_by__nickname'))
        if deploy_id:
            data = data.filter(deploy_id=deploy_id, status='5')
        return json_response([x.to_view() for x in data])

    def post(self, request):
        form, error = JsonParser(
            Argument('deploy_id', type=int, help='参数错误'),
            Argument('version', help='请输入构建版本'),
            Argument('extra', type=list, help='参数错误'),
            Argument('remarks', required=False)
        ).parse(request.body)
        if error is None:
            deploy = Deploy.objects.filter(pk=form.deploy_id).first()
            if not deploy:
                return json_response(error='未找到指定发布配置')
            form.extra = json.dumps(form.extra)
            form.spug_version = Repository.make_spug_version(deploy.id)
            rep = Repository.objects.create(
                app_id=deploy.app_id,
                env_id=deploy.env_id,
                created_by=request.user,
                **form)
            Thread(target=dispatch, args=(rep,)).start()
            return json_response(rep.to_view())
        return json_response(error=error)

    def patch(self, request):
        form, error = JsonParser(
            Argument('id', type=int, help='参数错误'),
            Argument('action', help='参数错误')
        ).parse(request.body)
        if error is None:
            rep = Repository.objects.filter(pk=form.id).first()
            if not rep:
                return json_response(error='未找到指定构建记录')
            if form.action == 'rebuild':
                Thread(target=dispatch, args=(rep,)).start()
                return json_response(rep.to_view())
        return json_response(error=error)

    def delete(self, request):
        form, error = JsonParser(
            Argument('id', type=int, help='请指定操作对象')
        ).parse(request.GET)
        if error is None:
            repository = Repository.objects.filter(pk=form.id).first()
            if not repository:
                return json_response(error='未找到指定构建记录')
            if repository.deployrequest_set.exists():
                return json_response(error='已关联发布申请无法删除')
            repository.delete()
            build_file = f'{repository.spug_version}.tar.gz'
            os.remove(os.path.join(settings.REPOS_DIR, 'build', build_file))
        return json_response(error=error)


def get_requests(request):
    form, error = JsonParser(
        Argument('repository_id', type=int, help='参数错误')
    ).parse(request.GET)
    if error is None:
        requests = []
        for item in DeployRequest.objects.filter(repository_id=form.repository_id):
            data = item.to_dict(selects=('id', 'name', 'created_at'))
            data['host_ids'] = json.loads(item.host_ids)
            data['status_alias'] = item.get_status_display()
            requests.append(data)
        return json_response(requests)
