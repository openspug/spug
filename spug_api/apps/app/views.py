# Copyright: (c) OpenSpug Organization. https://github.com/openspug/spug
# Copyright: (c) <spug.dev@gmail.com>
# Released under the MIT License.
from django.views.generic import View
from django.db.models import F
from libs import JsonParser, Argument, json_response
from apps.app.models import App, Deploy, DeployExtend1, DeployExtend2
from apps.config.models import Config
from apps.app.utils import parse_envs, fetch_versions
import json


class AppView(View):
    def get(self, request):
        query = {}
        if not request.user.is_supper:
            query['id__in'] = request.user.deploy_perms['apps']
        apps = App.objects.filter(**query)
        return json_response(apps)

    def post(self, request):
        form, error = JsonParser(
            Argument('id', type=int, required=False),
            Argument('name', help='请输入服务名称'),
            Argument('key', help='请输入唯一标识符'),
            Argument('desc', required=False)
        ).parse(request.body)
        if error is None:
            app = App.objects.filter(key=form.key).first()
            if app and app.id != form.id:
                return json_response(error=f'唯一标识符 {form.key} 已存在，请更改后重试')
            if form.id:
                App.objects.filter(pk=form.id).update(**form)
            else:
                App.objects.create(created_by=request.user, **form)
        return json_response(error=error)

    def patch(self, request):
        form, error = JsonParser(
            Argument('id', type=int, help='参数错误'),
            Argument('rel_apps', type=list, required=False),
            Argument('rel_services', type=list, required=False)
        ).parse(request.body)
        if error is None:
            app = App.objects.filter(pk=form.id).first()
            if not app:
                return json_response(error='未找到指定应用')
            app.rel_apps = json.dumps(form.rel_apps)
            app.rel_services = json.dumps(form.rel_services)
            app.save()
        return json_response(error=error)

    def delete(self, request):
        form, error = JsonParser(
            Argument('id', type=int, help='请指定操作对象')
        ).parse(request.GET)
        if error is None:
            if Deploy.objects.filter(app_id=form.id).exists():
                return json_response(error='该应用在应用发布中已存在关联的发布配置，请删除相关发布配置后再尝试删除')
            if Config.objects.filter(type='app', o_id=form.id).exists():
                return json_response(error='该应用在配置中心已存在关联的配置信息，请删除相关配置后再尝试删除')
            App.objects.filter(pk=form.id).delete()
        return json_response(error=error)


class DeployView(View):
    def get(self, request):
        form, error = JsonParser(
            Argument('app_id', type=int, required=False)
        ).parse(request.GET, True)
        if not request.user.is_supper:
            perms = request.user.deploy_perms
            form.app_id__in = perms['apps']
            form.env_id__in = perms['envs']
        deploys = Deploy.objects.filter(**form).annotate(app_name=F('app__name'))
        return json_response(deploys)

    def post(self, request):
        form, error = JsonParser(
            Argument('id', type=int, required=False),
            Argument('app_id', type=int, help='请选择应用'),
            Argument('env_id', type=int, help='请选择环境'),
            Argument('host_ids', type=list, filter=lambda x: len(x), help='请选择要部署的主机'),
            Argument('extend', filter=lambda x: x in dict(Deploy.EXTENDS), help='请选择发布类型'),
            Argument('is_audit', type=bool, default=False)
        ).parse(request.body)
        if error is None:
            deploy = Deploy.objects.filter(app_id=form.app_id, env_id=form.env_id).first()
            if deploy and deploy.id != form.id:
                return json_response(error='应用在该环境下已经存在发布配置')
            form.host_ids = json.dumps(form.host_ids)
            if form.extend == '1':
                extend_form, error = JsonParser(
                    Argument('git_repo', handler=str.strip, help='请输入git仓库地址'),
                    Argument('dst_dir', handler=str.strip, help='请输入发布目标路径'),
                    Argument('dst_repo', handler=str.strip, help='请输入目标仓库路径'),
                    Argument('versions', type=int, help='请输入保留历史版本数量'),
                    Argument('filter_rule', type=dict, help='参数错误'),
                    Argument('custom_envs', handler=str.strip, required=False),
                    Argument('hook_pre_server', handler=str.strip, default=''),
                    Argument('hook_post_server', handler=str.strip, default=''),
                    Argument('hook_pre_host', handler=str.strip, default=''),
                    Argument('hook_post_host', handler=str.strip, default='')
                ).parse(request.body)
                if error:
                    return json_response(error=error)
                extend_form.filter_rule = json.dumps(extend_form.filter_rule)
                extend_form.custom_envs = json.dumps(parse_envs(extend_form.custom_envs))
                if form.id:
                    Deploy.objects.filter(pk=form.id).update(**form)
                    DeployExtend1.objects.filter(deploy_id=form.id).update(**extend_form)
                else:
                    deploy = Deploy.objects.create(created_by=request.user, **form)
                    DeployExtend1.objects.create(deploy=deploy, **extend_form)
            elif form.extend == '2':
                extend_form, error = JsonParser(
                    Argument('server_actions', type=list, help='请输入执行动作'),
                    Argument('host_actions', type=list, help='请输入执行动作')
                ).parse(request.body)
                if error:
                    return json_response(error=error)
                if len(extend_form.server_actions) + len(extend_form.host_actions) == 0:
                    return json_response(error='请至少设置一个执行的动作')
                extend_form.server_actions = json.dumps(extend_form.server_actions)
                extend_form.host_actions = json.dumps(extend_form.host_actions)
                if form.id:
                    Deploy.objects.filter(pk=form.id).update(**form)
                    DeployExtend2.objects.filter(deploy_id=form.id).update(**extend_form)
                else:
                    deploy = Deploy.objects.create(created_by=request.user, **form)
                    DeployExtend2.objects.create(deploy=deploy, **extend_form)
        return json_response(error=error)

    def delete(self, request):
        form, error = JsonParser(
            Argument('id', type=int, help='请指定操作对象')
        ).parse(request.GET)
        if error is None:
            Deploy.objects.filter(pk=form.id).delete()
        return json_response(error=error)


def get_versions(request, d_id):
    deploy = Deploy.objects.filter(pk=d_id).first()
    if not deploy:
        return json_response(error='未找到指定应用')
    if deploy.extend == '2':
        return json_response(error='该应用不支持此操作')
    branches, tags = fetch_versions(deploy)
    return json_response({'branches': branches, 'tags': tags})
