# Copyright: (c) OpenSpug Organization. https://github.com/openspug/spug
# Copyright: (c) <spug.dev@gmail.com>
# Released under the MIT License.
from django.views.generic import View
from django.db.models import F
from libs import json_response, JsonParser, Argument, human_datetime, human_time
from apps.deploy.models import DeployRequest
from apps.app.models import Deploy
from apps.deploy.utils import deploy_dispatch
from apps.host.models import Host
from threading import Thread
from datetime import datetime
import json
import uuid


class RequestView(View):
    def get(self, request):
        data, query = [], {}
        if not request.user.is_supper:
            perms = request.user.deploy_perms
            query['deploy__app_id__in'] = perms['apps']
            query['deploy__env_id__in'] = perms['envs']
        for item in DeployRequest.objects.filter(**query).annotate(
                env_name=F('deploy__env__name'),
                app_name=F('deploy__app__name'),
                app_host_ids=F('deploy__host_ids'),
                app_extend=F('deploy__extend'),
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
            Argument('deploy_id', type=int, help='缺少必要参数'),
            Argument('name', help='请输申请标题'),
            Argument('extra', type=list, help='缺少必要参数'),
            Argument('host_ids', type=list, filter=lambda x: len(x), help='请选择要部署的主机'),
            Argument('desc', required=False),
        ).parse(request.body)
        if error is None:
            deploy = Deploy.objects.filter(pk=form.deploy_id).first()
            if not deploy:
                return json_response(error='未找到该发布配置')
            form.status = '0' if deploy.is_audit else '1'
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

    def put(self, request):
        form, error = JsonParser(
            Argument('id', type=int, help='缺少必要参数'),
            Argument('action', filter=lambda x: x in ('check', 'do'), help='参数错误')
        ).parse(request.body)
        if error is None:
            req = DeployRequest.objects.filter(pk=form.id).first()
            if not req:
                return json_response(error='未找到指定发布申请')
            pre_req = DeployRequest.objects.filter(
                deploy_id=req.deploy_id,
                type='1',
                id__lt=req.id,
                version__isnull=False).first()
            if not pre_req:
                return json_response(error='未找到该应用可以用于回滚的版本')
            if form.action == 'check':
                return json_response({'date': pre_req.created_at, 'name': pre_req.name})
            DeployRequest.objects.create(
                deploy_id=req.deploy_id,
                name=f'{req.name} - 回滚',
                type='2',
                extra=pre_req.extra,
                host_ids=req.host_ids,
                status='0' if pre_req.deploy.is_audit else '1',
                desc='自动回滚至该应用的上个版本',
                version=pre_req.version,
                created_by=request.user
            )
        return json_response(error=error)

    def delete(self, request):
        form, error = JsonParser(
            Argument('id', type=int, help='缺少必要参数')
        ).parse(request.GET)
        if error is None:
            DeployRequest.objects.filter(pk=form.id, status__in=('0', '1', '-1')).delete()
        return json_response(error=error)


class RequestDetailView(View):
    def get(self, request, r_id):
        req = DeployRequest.objects.filter(pk=r_id).first()
        if not req:
            return json_response(error='未找到指定发布申请')
        hosts = Host.objects.filter(id__in=json.loads(req.host_ids))
        targets = [{'id': x.id, 'title': f'{x.name}({x.hostname}:{x.port})'} for x in hosts]
        server_actions, host_actions = [], []
        if req.deploy.extend == '2':
            server_actions = json.loads(req.deploy.extend_obj.server_actions)
            host_actions = json.loads(req.deploy.extend_obj.host_actions)
        return json_response({
            'app_name': req.deploy.app.name,
            'env_name': req.deploy.env.name,
            'status': req.status,
            'type': req.type,
            'status_alias': req.get_status_display(),
            'targets': targets,
            'server_actions': server_actions,
            'host_actions': host_actions
        })

    def post(self, request, r_id):
        query = {'pk': r_id}
        if not request.user.is_supper:
            perms = request.user.deploy_perms
            query['deploy__app_id__in'] = perms['apps']
            query['deploy__env_id__in'] = perms['envs']
        req = DeployRequest.objects.filter(**query).first()
        if not req:
            return json_response(error='未找到指定发布申请')
        if req.status not in ('1', '-3'):
            return json_response(error='该申请单当前状态还不能执行发布')
        hosts = Host.objects.filter(id__in=json.loads(req.host_ids))
        token = uuid.uuid4().hex
        outputs = {str(x.id): {'data': ''} for x in hosts}
        outputs.update(local={'data': f'{human_time()} 建立接连...        '})
        req.status = '2'
        if not req.version:
            req.version = f'{req.deploy_id}_{req.id}_{datetime.now().strftime("%Y%m%d%H%M%S")}'
        req.save()
        Thread(target=deploy_dispatch, args=(request, req, token)).start()
        return json_response({'token': token, 'type': req.type, 'outputs': outputs})

    def patch(self, request, r_id):
        form, error = JsonParser(
            Argument('reason', required=False),
            Argument('is_pass', type=bool, help='参数错误')
        ).parse(request.body)
        if error is None:
            req = DeployRequest.objects.filter(pk=r_id).first()
            if not req:
                return json_response(error='未找到指定申请')
            if not form.is_pass and not form.reason:
                return json_response(error='请输入驳回原因')
            if req.status != '0':
                return json_response(error='该申请当前状态不允许审核')
            req.approve_at = human_datetime()
            req.approve_by = request.user
            req.status = '1' if form.is_pass else '-1'
            req.reason = form.reason
            req.save()
        return json_response(error=error)
