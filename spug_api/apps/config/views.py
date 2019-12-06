from django.views.generic import View
from libs import json_response, JsonParser, Argument, human_time
from apps.config.models import Environment, ConfigValue


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
