# Copyright: (c) OpenSpug Organization. https://github.com/openspug/spug
# Copyright: (c) <spug.dev@gmail.com>
# Released under the AGPL-3.0 License.
from django.views.generic import View
from django.db.models import F
from django.conf import settings
from django.http.response import HttpResponseBadRequest
from django_redis import get_redis_connection
from libs import json_response, JsonParser, Argument, human_datetime, human_time
from apps.deploy.models import DeployRequest
from apps.app.models import Deploy, DeployExtend2
from apps.deploy.utils import deploy_dispatch, Helper
from apps.host.models import Host
from collections import defaultdict
from threading import Thread
from datetime import datetime
import subprocess
import json
import uuid
import os


class RequestView(View):
    def get(self, request):
        data, query = [], {}
        if not request.user.is_supper:
            perms = request.user.deploy_perms
            query['deploy__app_id__in'] = perms['apps']
            query['deploy__env_id__in'] = perms['envs']
        for item in DeployRequest.objects.filter(**query).annotate(
                env_id=F('deploy__env_id'),
                env_name=F('deploy__env__name'),
                app_id=F('deploy__app_id'),
                app_name=F('deploy__app__name'),
                app_host_ids=F('deploy__host_ids'),
                app_extend=F('deploy__extend'),
                created_by_user=F('created_by__nickname')):
            tmp = item.to_dict()
            tmp['env_id'] = item.env_id
            tmp['env_name'] = item.env_name
            tmp['app_id'] = item.app_id
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
            if form.extra[0] == 'tag' and not form.extra[1]:
                return json_response(error='请选择要发布的Tag')
            if form.extra[0] == 'branch' and not form.extra[2]:
                return json_response(error='请选择要发布的分支及Commit ID')
            if deploy.extend == '2':
                if form.extra[0]:
                    form.extra[0] = form.extra[0].replace("'", '')
                if DeployExtend2.objects.filter(deploy=deploy, host_actions__contains='"src_mode": "1"').exists():
                    if len(form.extra) < 2:
                        return json_response(error='该应用的发布配置中使用了数据传输动作且设置为发布时上传，请上传要传输的数据')
                    form.version = form.extra[1].get('path')
            form.name = form.name.replace("'", '')
            form.status = '0' if deploy.is_audit else '1'
            form.extra = json.dumps(form.extra)
            form.host_ids = json.dumps(form.host_ids)
            if form.id:
                req = DeployRequest.objects.get(pk=form.id)
                is_required_notify = deploy.is_audit and req.status == '-1'
                DeployRequest.objects.filter(pk=form.id).update(
                    created_by=request.user,
                    reason=None,
                    **form
                )
            else:
                req = DeployRequest.objects.create(created_by=request.user, **form)
                is_required_notify = deploy.is_audit
            if is_required_notify:
                Thread(target=Helper.send_deploy_notify, args=(req, 'approve_req')).start()
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
            Argument('id', type=int, required=False),
            Argument('expire', required=False),
            Argument('count', type=int, required=False, help='请输入数字')
        ).parse(request.GET)
        if error is None:
            if form.id:
                DeployRequest.objects.filter(pk=form.id, status__in=('0', '1', '-1')).delete()
                return json_response()
            elif form.count:
                if form.count < 1:
                    return json_response(error='请输入正确的保留数量')
                counter, ids = defaultdict(int), []
                for item in DeployRequest.objects.all():
                    if counter[item.deploy_id] == form.count:
                        ids.append(item.id)
                    else:
                        counter[item.deploy_id] += 1
                count, _ = DeployRequest.objects.filter(id__in=ids).delete()
                return json_response(count)
            elif form.expire:
                count, _ = DeployRequest.objects.filter(created_at__lt=form.expire).delete()
                return json_response(count)
            else:
                return json_response(error='请至少使用一个删除条件')
        return json_response(error=error)


class RequestDetailView(View):
    def get(self, request, r_id):
        req = DeployRequest.objects.filter(pk=r_id).first()
        if not req:
            return json_response(error='未找到指定发布申请')
        hosts = Host.objects.filter(id__in=json.loads(req.host_ids))
        targets = [{'id': x.id, 'title': f'{x.name}({x.hostname}:{x.port})'} for x in hosts]
        server_actions, host_actions, outputs = [], [], []
        if req.deploy.extend == '2':
            server_actions = json.loads(req.deploy.extend_obj.server_actions)
            host_actions = json.loads(req.deploy.extend_obj.host_actions)
        if request.GET.get('log'):
            rds, key, counter = get_redis_connection(), f'{settings.REQUEST_KEY}:{r_id}', 0
            data = rds.lrange(key, counter, counter + 9)
            while data:
                counter += 10
                outputs.extend(x.decode() for x in data)
                data = rds.lrange(key, counter, counter + 9)
        return json_response({
            'app_name': req.deploy.app.name,
            'env_name': req.deploy.env.name,
            'status': req.status,
            'type': req.type,
            'status_alias': req.get_status_display(),
            'targets': targets,
            'server_actions': server_actions,
            'host_actions': host_actions,
            'outputs': outputs
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
        outputs = {str(x.id): {'data': []} for x in hosts}
        outputs.update(local={'data': [f'{human_time()} 建立接连...        ']})
        req.status = '2'
        req.do_at = human_datetime()
        req.do_by = request.user
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
            Thread(target=Helper.send_deploy_notify, args=(req, 'approve_rst')).start()
        return json_response(error=error)


def do_upload(request):
    repos_dir = settings.REPOS_DIR
    file = request.FILES['file']
    deploy_id = request.POST.get('deploy_id')
    if file and deploy_id:
        dir_name = os.path.join(repos_dir, deploy_id)
        file_name = datetime.now().strftime("%Y%m%d%H%M%S")
        command = f'mkdir -p {dir_name} && cd {dir_name} && ls | sort  -rn | tail -n +11 | xargs rm -rf'
        code, outputs = subprocess.getstatusoutput(command)
        if code != 0:
            return json_response(error=outputs)
        with open(os.path.join(dir_name, file_name), 'wb') as f:
            for chunk in file.chunks():
                f.write(chunk)
        return json_response(file_name)
    else:
        return HttpResponseBadRequest()
