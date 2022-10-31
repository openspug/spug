# Copyright: (c) OpenSpug Organization. https://github.com/openspug/spug
# Copyright: (c) <spug.dev@gmail.com>
# Released under the AGPL-3.0 License.
from django.views.generic import View
from django.db.models import F
from libs import JsonParser, Argument, json_response, auth
from apps.app.models import App, Deploy, DeployExtend1, DeployExtend2
from apps.config.models import Config, ConfigHistory, Service
from apps.app.utils import fetch_versions, remove_repo
from apps.setting.utils import AppSetting
import json
import re


class AppView(View):
    def get(self, request):
        form, error = JsonParser(
            Argument('id', type=int, required=False)
        ).parse(request.GET)
        if error is None:
            if request.user.is_supper:
                apps = App.objects.all()
            else:
                ids = request.user.deploy_perms['apps']
                apps = App.objects.filter(id__in=ids)

            if form.id:
                app = apps.filter(pk=form.id).first()
                return json_response(app)
            return json_response(apps)
        return json_response(error=error)

    @auth('deploy.app.add|deploy.app.edit|config.app.add|config.app.edit')
    def post(self, request):
        form, error = JsonParser(
            Argument('id', type=int, required=False),
            Argument('name', help='请输入服务名称'),
            Argument('key', help='请输入唯一标识符'),
            Argument('desc', required=False)
        ).parse(request.body)
        if error is None:
            if not re.fullmatch(r'\w+', form.key, re.ASCII):
                return json_response(error='标识符必须为字母、数字和下划线的组合')

            app = App.objects.filter(key=form.key).first()
            if app and app.id != form.id:
                return json_response(error='该识符已存在，请更改后重试')
            service = Service.objects.filter(key=form.key).first()
            if service:
                return json_response(error=f'该标识符已被服务 {service.name} 使用，请更改后重试')
            if form.id:
                App.objects.filter(pk=form.id).update(**form)
            else:
                app = App.objects.create(created_by=request.user, **form)
                app.sort_id = app.id
                app.save()
        return json_response(error=error)

    @auth('deploy.app.edit|config.app.edit_config')
    def patch(self, request):
        form, error = JsonParser(
            Argument('id', type=int, help='参数错误'),
            Argument('rel_apps', type=list, required=False),
            Argument('rel_services', type=list, required=False),
            Argument('sort', filter=lambda x: x in ('up', 'down'), required=False)
        ).parse(request.body)
        if error is None:
            app = App.objects.filter(pk=form.id).first()
            if not app:
                return json_response(error='未找到指定应用')
            if form.rel_apps is not None:
                app.rel_apps = json.dumps(form.rel_apps)
            if form.rel_services is not None:
                app.rel_services = json.dumps(form.rel_services)
            if form.sort:
                if form.sort == 'up':
                    tmp = App.objects.filter(sort_id__gt=app.sort_id).last()
                else:
                    tmp = App.objects.filter(sort_id__lt=app.sort_id).first()
                if tmp:
                    tmp.sort_id, app.sort_id = app.sort_id, tmp.sort_id
                    tmp.save()
            app.save()
        return json_response(error=error)

    @auth('deploy.app.del|config.app.del')
    def delete(self, request):
        form, error = JsonParser(
            Argument('id', type=int, help='请指定操作对象')
        ).parse(request.GET)
        if error is None:
            if Deploy.objects.filter(app_id=form.id).exists():
                return json_response(error='该应用在应用发布中已存在关联的发布配置，请删除相关发布配置后再尝试删除')
            # auto delete configs
            Config.objects.filter(type='app', o_id=form.id).delete()
            ConfigHistory.objects.filter(type='app', o_id=form.id).delete()
            for app in App.objects.filter(rel_apps__isnull=False):
                rel_apps = json.loads(app.rel_apps)
                if form.id in rel_apps:
                    rel_apps.remove(form.id)
                    app.rel_apps = json.dumps(rel_apps)
                    app.save()
            App.objects.filter(pk=form.id).delete()
        return json_response(error=error)


class DeployView(View):
    @auth('deploy.app.view|deploy.request.view')
    def get(self, request):
        form, error = JsonParser(
            Argument('app_id', type=int, required=False)
        ).parse(request.GET, True)
        if not request.user.is_supper:
            perms = request.user.deploy_perms
            form.app_id__in = perms['apps']
            form.env_id__in = perms['envs']
        deploys = Deploy.objects.filter(**form) \
            .annotate(app_name=F('app__name'), app_key=F('app__key')) \
            .order_by('-app__sort_id')
        return json_response(deploys)

    @auth('deploy.app.edit')
    def post(self, request):
        form, error = JsonParser(
            Argument('id', type=int, required=False),
            Argument('app_id', type=int, help='请选择应用'),
            Argument('env_id', type=int, help='请选择环境'),
            Argument('host_ids', type=list, filter=lambda x: len(x), help='请选择要部署的主机'),
            Argument('rst_notify', type=dict, help='请选择发布结果通知方式'),
            Argument('extend', filter=lambda x: x in dict(Deploy.EXTENDS), help='请选择发布类型'),
            Argument('is_parallel', type=bool, default=True),
            Argument('is_audit', type=bool, default=False)
        ).parse(request.body)
        if error is None:
            deploy = Deploy.objects.filter(app_id=form.app_id, env_id=form.env_id).first()
            if deploy and deploy.id != form.id:
                return json_response(error='应用在该环境下已经存在发布配置')
            form.host_ids = json.dumps(form.host_ids)
            form.rst_notify = json.dumps(form.rst_notify)
            if form.extend == '1':
                extend_form, error = JsonParser(
                    Argument('git_repo', handler=str.strip, help='请输入git仓库地址'),
                    Argument('dst_dir', handler=str.strip, help='请输入发布部署路径'),
                    Argument('dst_repo', handler=str.strip, help='请输入发布存储路径'),
                    Argument('versions', type=int, filter=lambda x: x > 0, help='请输入发布保留版本数量'),
                    Argument('filter_rule', type=dict, help='参数错误'),
                    Argument('hook_pre_server', handler=str.strip, default=''),
                    Argument('hook_post_server', handler=str.strip, default=''),
                    Argument('hook_pre_host', handler=str.strip, default=''),
                    Argument('hook_post_host', handler=str.strip, default='')
                ).parse(request.body)
                if error:
                    return json_response(error=error)
                extend_form.dst_dir = extend_form.dst_dir.rstrip('/')
                extend_form.filter_rule = json.dumps(extend_form.filter_rule)
                if form.id:
                    extend = DeployExtend1.objects.filter(deploy_id=form.id).first()
                    if extend.git_repo != extend_form.git_repo:
                        remove_repo(form.id)
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
                extend_form.require_upload = any(x.get('src_mode') == '1' for x in extend_form.host_actions)
                extend_form.server_actions = json.dumps(extend_form.server_actions)
                extend_form.host_actions = json.dumps(extend_form.host_actions)
                if form.id:
                    Deploy.objects.filter(pk=form.id).update(**form)
                    DeployExtend2.objects.filter(deploy_id=form.id).update(**extend_form)
                else:
                    deploy = Deploy.objects.create(created_by=request.user, **form)
                    DeployExtend2.objects.create(deploy=deploy, **extend_form)
        return json_response(error=error)

    @auth('deploy.app.del')
    def delete(self, request):
        form, error = JsonParser(
            Argument('id', type=int, help='请指定操作对象')
        ).parse(request.GET)
        if error is None:
            deploy = Deploy.objects.get(pk=form.id)
            if deploy.deployrequest_set.exists():
                return json_response(error='已存在关联的发布记录，请删除关联的发布记录后再尝试删除发布配置')
            for item in deploy.repository_set.all():
                item.delete()
            deploy.delete()
        return json_response(error=error)


@auth('deploy.app.config|deploy.repository.add|deploy.request.add|deploy.request.edit')
def get_versions(request, d_id):
    deploy = Deploy.objects.filter(pk=d_id).first()
    if not deploy:
        return json_response(error='未找到指定应用')
    if deploy.extend == '2':
        return json_response(error='该应用不支持此操作')
    branches, tags = fetch_versions(deploy)
    return json_response({'branches': branches, 'tags': tags})


@auth('deploy.app.config|deploy.app.edit')
def kit_key(request):
    form, error = JsonParser(
        Argument('key', filter=lambda x: x in ('api_key', 'public_key'), help='参数错误')
    ).parse(request.body)
    if error is None:
        api_key = AppSetting.get_default(form.key)
        return json_response(api_key)
    return json_response(error=error)
