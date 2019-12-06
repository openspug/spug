from django.views.generic import View
from libs import json_response, JsonParser, Argument, human_time
from apps.config.models import Environment, ConfigValue, Service, ConfigKey


class EnvironmentView(View):
    def get(self, request):
        envs = Environment.objects.all()
        return json_response(envs)

    def post(self, request):
        form, error = JsonParser(
            Argument('id', type=int, required=False),
            Argument('name', help='请输入环境名称'),
            Argument('key', help='请输入唯一标识符'),
            Argument('desc', required=False)
        ).parse(request.body)
        if error is None:
            env = Environment.objects.filter(key=form.key).first()
            if env and env.id != form.id:
                return json_response(error=f'唯一标识符 {form.key} 已存在，请更改后重试')
            if form.id:
                Environment.objects.filter(pk=form.id).update(**form)
            else:
                Environment.objects.create(created_by=request.user, **form)
        return json_response(error=error)

    def delete(self, request):
        form, error = JsonParser(
            Argument('id', type=int, help='请指定操作对象')
        ).parse(request.GET)
        if error is None:
            if ConfigValue.objects.filter(env_id=form.id).exists():
                return json_response(error='该环境已存在关联的配置信息，请删除相关配置后再尝试删除')
            Environment.objects.filter(pk=form.id).delete()
        return json_response(error=error)


class ServiceView(View):
    def get(self, request):
        services = Service.objects.all()
        return json_response(services)

    def post(self, request):
        form, error = JsonParser(
            Argument('id', type=int, required=False),
            Argument('name', help='请输入服务名称'),
            Argument('key', help='请输入唯一标识符'),
            Argument('desc', required=False)
        ).parse(request.body)
        if error is None:
            service = Service.objects.filter(key=form.key).first()
            if service and service.id != form.id:
                return json_response(error=f'唯一标识符 {form.key} 已存在，请更改后重试')
            if form.id:
                Service.objects.filter(pk=form.id).update(**form)
            else:
                Service.objects.create(created_by=request.user, **form)
        return json_response(error=error)

    def delete(self, request):
        form, error = JsonParser(
            Argument('id', type=int, help='请指定操作对象')
        ).parse(request.GET)
        if error is None:
            if ConfigKey.objects.filter(type='src', o_id=form.id).exists():
                return json_response(error='该服务已存在关联的配置信息，请删除相关配置后再尝试删除')
            Service.objects.filter(pk=form.id).delete()
        return json_response(error=error)