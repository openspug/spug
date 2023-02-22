# Copyright: (c) OpenSpug Organization. https://github.com/openspug/spug
# Copyright: (c) <spug.dev@gmail.com>
# Released under the AGPL-3.0 License.
from django.views.generic import View
from libs import JsonParser, Argument, json_response, auth
from apps.pipeline.models import Pipeline
import json


class PipeView(View):
    def get(self, request):
        form, error = JsonParser(
            Argument('id', type=int, required=False)
        ).parse(request.GET)
        if error is None:
            if form.id:
                pipe = Pipeline.objects.filter(pk=form.id).first()
                if not pipe:
                    return json_response(error='未找到指定流程')
                response = pipe.to_view()
            else:
                pipes = Pipeline.objects.all()
                response = [x.to_list() for x in pipes]
            return json_response(response)

    @auth('deploy.app.add|deploy.app.edit|config.app.add|config.app.edit')
    def post(self, request):
        form, error = JsonParser(
            Argument('id', type=int, required=False),
            Argument('name', help='请输入流程名称'),
            Argument('nodes', type=list, handler=json.dumps, default='[]')
        ).parse(request.body)
        if error is None:
            if form.id:
                Pipeline.objects.filter(pk=form.id).update(**form)
                pipe = Pipeline.objects.get(pk=form.id)
            else:
                pipe = Pipeline.objects.create(created_by=request.user, **form)
            return json_response(pipe.to_view())
        return json_response(error=error)

    def patch(self, request):
        form, error = JsonParser(
            Argument('id', type=int, help='请指定操作对象'),
            Argument('name', required=False),
            Argument('nodes', type=list, handler=json.dumps, required=False),
        ).parse(request.body, True)
        if error is None:
            Pipeline.objects.filter(pk=form.id).update(**form)
        return json_response(error=error)

    @auth('deploy.app.del|config.app.del')
    def delete(self, request):
        form, error = JsonParser(
            Argument('id', type=int, help='请指定操作对象')
        ).parse(request.GET)
        if error is None:
            Pipeline.objects.filter(pk=form.id).delete()
        return json_response(error=error)
