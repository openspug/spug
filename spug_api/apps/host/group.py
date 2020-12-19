# Copyright: (c) OpenSpug Organization. https://github.com/openspug/spug
# Copyright: (c) <spug.dev@gmail.com>
# Released under the AGPL-3.0 License.
from django.views.generic import View
from django.db.models import F
from libs import json_response, JsonParser, Argument
from apps.host.models import Group


def fetch_children(data):
    if data:
        sub_data = dict()
        for item in Group.objects.filter(parent_id__in=data.keys()):
            tmp = item.to_view()
            sub_data[item.id] = tmp
            data[item.parent_id]['children'].append(tmp)
        return fetch_children(sub_data)


def merge_children(data, prefix, childes):
    prefix = f'{prefix}/' if prefix else ''
    for item in childes:
        name = f'{prefix}{item["title"]}'
        item['name'] = name
        if item['children']:
            merge_children(data, name, item['children'])
        else:
            data.append({'id': item['key'], 'name': name})


class GroupView(View):
    def get(self, request):
        data, data2 = dict(), []
        for item in Group.objects.filter(parent_id=0):
            data[item.id] = item.to_view()
        fetch_children(data)
        if not data:
            grp = Group.objects.create(name='Default', sort_id=1)
            data[grp.id] = grp.to_view()

        data = list(data.values())
        merge_children(data2, '', data)
        return json_response({'treeData': data, 'groups': data2})

    def post(self, request):
        form, error = JsonParser(
            Argument('id', type=int, required=False),
            Argument('parent_id', type=int, default=0),
            Argument('name', help='请输入分组名称')
        ).parse(request.body)
        if error is None:
            if form.id:
                Group.objects.filter(pk=form.id).update(name=form.name)
            else:
                group = Group.objects.create(**form)
                group.sort_id = group.id
                group.save()
        return json_response(error=error)

    def patch(self, request):
        form, error = JsonParser(
            Argument('s_id', type=int, help='参数错误'),
            Argument('d_id', type=int, help='参数错误'),
            Argument('action', type=int, help='参数错误')
        ).parse(request.body)
        if error is None:
            src = Group.objects.get(pk=form.s_id)
            dst = Group.objects.get(pk=form.d_id)
            if form.action == 0:
                src.parent_id = dst.id
                src.save()
                return json_response()
            src.parent_id = dst.parent_id
            if src.sort_id > dst.sort_id:
                if form.action == -1:
                    dst = Group.objects.filter(sort_id__gt=dst.sort_id).last()
                Group.objects.filter(sort_id__lt=src.sort_id, sort_id__gte=dst.sort_id).update(sort_id=F('sort_id') + 1)
            else:
                if form.action == 1:
                    dst = Group.objects.filter(sort_id__lt=dst.sort_id).first()
                Group.objects.filter(sort_id__lte=dst.sort_id, sort_id__gt=src.sort_id).update(sort_id=F('sort_id') - 1)
            src.sort_id = dst.sort_id
            src.save()
        return json_response(error=error)

    def delete(self, request):
        form, error = JsonParser(
            Argument('id', type=int, help='参数错误')
        ).parse(request.GET)
        if error is None:
            group = Group.objects.filter(pk=form.id).first()
            if not group:
                return json_response(error='未找到指定分组')
            if Group.objects.filter(parent_id=group.id).exists():
                return json_response(error='请移除子分组后再尝试删除')
            if group.hosts.exists():
                return json_response(error='请移除分组下的主机后再尝试删除')
            group.delete()
        return json_response(error=error)
