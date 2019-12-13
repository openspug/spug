from django.views.generic import View
from libs import JsonParser, Argument, json_response
from apps.app.models import App, AppExtend1, AppExtend2
import json


class AppView(View):
    def get(self, request):
        apps = App.objects.all()
        return json_response(apps)

    def post(self, request):
        form, error = JsonParser(
            Argument('id', type=int, required=False),
            Argument('name', help='请输入应用名称'),
            Argument('env_id', type=int, help='请选择环境'),
            Argument('host_ids', type=list, filter=lambda x: len(x), help='请选择要部署的主机'),
            Argument('extend', filter=lambda x: x in dict(App.EXTENDS), help='请选择发布类型'),
            Argument('is_audit', type=bool, default=False)
        ).parse(request.body)
        if error is None:
            form.host_ids = json.dumps(form.host_ids)
            if form.extend == '1':
                extend_form, error = JsonParser(
                    Argument('git_repo', handler=str.strip, help='请输入git仓库地址'),
                    Argument('git_type', help='参数错误'),
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
                    App.objects.filter(pk=form.id).update(**form)
                    AppExtend1.objects.filter(app_id=form.id).update(**extend_form)
                else:
                    app = App.objects.create(created_by=request.user, **form)
                    AppExtend1.objects.create(app=app, **extend_form)
            elif form.extend == '2':
                extend_form, error = JsonParser(
                    Argument('actions', type=list, filter=lambda x: len(x), help='请输入执行动作')
                ).parse(request.body)
                if error:
                    return json_response(error=error)
                app = App.objects.create(created_by=request.user, **form)
                AppExtend2.objects.create(app=app, actions=json.dumps(extend_form.actions))
        return json_response(error=error)


def parse_envs(data):
    tmp = {}
    if data:
        for line in data.split('\n'):
            fields = line.split('=', 1)
            if len(fields) != 2 or fields[0].strip() == '':
                raise Exception(f'解析自定义全局变量{line!r}失败，确认其遵循 key = value 格式')
            tmp[fields[0].strip()] = fields[1].strip()
    return tmp
