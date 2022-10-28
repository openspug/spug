# Copyright: (c) OpenSpug Organization. https://github.com/openspug/spug
# Copyright: (c) <spug.dev@gmail.com>
# Released under the AGPL-3.0 License.
from django.views.generic import View
from django.db.models import F
from django.conf import settings
from django_redis import get_redis_connection
from libs import json_response, JsonParser, Argument, AttrDict, auth
from apps.repository.models import Repository
from apps.deploy.models import DeployRequest
from apps.repository.utils import dispatch
from apps.deploy.helper import Helper
from apps.app.models import Deploy
from threading import Thread
import json


class RepositoryView(View):
    @auth('deploy.repository.view|deploy.request.add|deploy.request.edit')
    def get(self, request):
        app_id = request.GET.get('app_id')
        data = Repository.objects.annotate(
            app_name=F('app__name'),
            env_name=F('env__name'),
            created_by_user=F('created_by__nickname'))
        if app_id:
            data = data.filter(app_id=app_id, status='5')
            return json_response([x.to_view() for x in data])

        response = dict()
        for item in data:
            if item.app_id in response:
                response[item.app_id]['child'].append(item.to_view())
            else:
                tmp = item.to_view()
                tmp['child'] = [item.to_view()]
                response[item.app_id] = tmp
        return json_response(list(response.values()))

    @auth('deploy.repository.add')
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

    @auth('deploy.repository.add|deploy.repository.build')
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

    @auth('deploy.repository.del')
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
        return json_response(error=error)


@auth('deploy.repository.view')
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


@auth('deploy.repository.view')
def get_detail(request, r_id):
    repository = Repository.objects.filter(pk=r_id).first()
    if not repository:
        return json_response(error='未找到指定构建记录')
    deploy_key = repository.deploy_key
    response = AttrDict(status=repository.status, token=deploy_key)
    output = {'data': ''}
    response.index = Helper.fill_outputs({'local': output}, deploy_key)

    if repository.status in ('0', '1'):
        output['data'] = Helper.term_message('等待初始化...') + output['data']
    elif not output['data']:
        output['data'] = Helper.term_message('未读取到数据，可能已被清理', 'warn', with_time=False)
    response.output = output
    return json_response(response)
