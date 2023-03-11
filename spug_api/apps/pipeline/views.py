# Copyright: (c) OpenSpug Organization. https://github.com/openspug/spug
# Copyright: (c) <spug.dev@gmail.com>
# Released under the AGPL-3.0 License.
from django.views.generic import View
from django_redis import get_redis_connection
from libs import JsonParser, Argument, json_response, auth
from libs.utils import AttrDict
from apps.pipeline.models import Pipeline, PipeHistory
from apps.pipeline.utils import NodeExecutor
from apps.host.models import Host
from threading import Thread
from uuid import uuid4
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


class DoView(View):
    @auth('exec.task.do')
    def get(self, request):
        pass

    @auth('exec.task.do')
    def post(self, request):
        form, error = JsonParser(
            Argument('id', type=int, help='参数错误'),
        ).parse(request.body)
        if error is None:
            pipe = Pipeline.objects.get(pk=form.id)
            nodes, ids = json.loads(pipe.nodes), set()
            for item in filter(lambda x: x['module'] == 'ssh_exec', nodes):
                ids.update(item['targets'])
            for item in filter(lambda x: x['module'] == 'data_transfer', nodes):
                ids.update(item['destination']['targets'])

            dynamic_params = None
            host_map = {x.id: f'{x.name}({x.hostname})' for x in Host.objects.filter(id__in=ids)}
            for item in nodes:
                if item['module'] == 'ssh_exec':
                    item['_targets'] = [{'id': x, 'name': host_map[x]} for x in item['targets']]
                elif item['module'] == 'data_transfer':
                    item['_targets'] = [{'id': x, 'name': host_map[x]} for x in item['destination']['targets']]
                elif item['module'] == 'parameter':
                    dynamic_params = item.get('dynamic_params')

            if not dynamic_params:
                latest_history = pipe.pipehistory_set.first()
                ordinal = latest_history.ordinal + 1 if latest_history else 1
                history = PipeHistory.objects.create(pipeline=pipe, ordinal=ordinal, created_by=request.user)

                rds = get_redis_connection()
                executor = NodeExecutor(rds, history.deploy_key, json.loads(pipe.nodes))
                Thread(target=executor.run).start()
                response = AttrDict(token=history.id, nodes=nodes)
            else:
                response = AttrDict(nodes=nodes, dynamic_params=dynamic_params)
            return json_response(response)
        return json_response(error=error)

    @auth('exec.task.do')
    def patch(self, request):
        form, error = JsonParser(
            Argument('id', type=int, help='参数错误'),
            Argument('params', type=dict, help='参数错误'),
            Argument('cols', type=int, required=False),
            Argument('rows', type=int, required=False)
        ).parse(request.body)
        if error is None:
            term = None
            if form.cols and form.rows:
                term = {'width': form.cols, 'height': form.rows}
            pipe = Pipeline.objects.get(pk=form.id)
            nodes = json.loads(pipe.nodes)
            for item in nodes:
                if item['module'] == 'parameter':
                    item['dynamic_params'] = form.params
                    break

            latest_history = pipe.pipehistory_set.first()
            ordinal = latest_history.ordinal + 1 if latest_history else 1
            PipeHistory.objects.create(pipeline=pipe, ordinal=ordinal, created_by=request.user)
            rds = get_redis_connection()

            token = uuid4().hex
            executor = NodeExecutor(rds, token, nodes)
            Thread(target=executor.run).start()
            response = AttrDict(token=token)
            return json_response(response)
        return json_response(error=error)
