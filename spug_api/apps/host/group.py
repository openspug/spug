# Copyright: (c) OpenSpug Organization. https://github.com/openspug/spug
# Copyright: (c) <spug.dev@gmail.com>
# Released under the AGPL-3.0 License.
from django.views.generic import View
from django.db.models import F
from libs import json_response, JsonParser, Argument, auth
from apps.host.models import Group
from apps.account.models import Role


def fetch_children(data, with_hosts):
    if data:
        sub_data = dict()
        for item in Group.objects.filter(parent_id__in=data.keys()):
            tmp = item.to_view(with_hosts)
            sub_data[item.id] = tmp
            data[item.parent_id]['children'].append(tmp)
        return fetch_children(sub_data, with_hosts)


def merge_children(data, prefix, childes):
    prefix = f'{prefix}/' if prefix else ''
    for item in childes:
        name = f'{prefix}{item["title"]}'
        item['name'] = name
        if item.get('children'):
            merge_children(data, name, item['children'])
        else:
            data[item['key']] = name


def filter_by_perm(data, result, ids):
    for item in data:
        if 'children' in item:
            if item['key'] in ids:
                result.append(item)
            elif item['children']:
                filter_by_perm(item['children'], result, ids)


class GroupView(View):
    @auth('host.host.view|host.console.view|exec.task.do')
    def get(self, request):
        with_hosts = request.GET.get('with_hosts')
        data, data2 = dict(), dict()
        for item in Group.objects.filter(parent_id=0):
            data[item.id] = item.to_view(with_hosts)
        fetch_children(data, with_hosts)
        if not data:
            grp = Group.objects.create(name='Default', sort_id=1)
            data[grp.id] = grp.to_view()
        if request.user.is_supper:
            tree_data = list(data.values())
        else:
            tree_data, ids = [], request.user.group_perms
            filter_by_perm(data.values(), tree_data, ids)
        merge_children(data2, '', tree_data)
        return json_response({'treeData': tree_data, 'groups': data2})

    @auth('admin')
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

    @auth('admin')
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
                dst = Group.objects.filter(parent_id=dst.id).first()
                if not dst:
                    src.save()
                    return json_response()
                form.action = -1
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

    @auth('admin')
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
            if not Group.objects.exclude(pk=form.id).exists():
                return json_response(error='请至少保留一个分组')
            role = Role.objects.filter(group_perms__regex=fr'[^0-9]{form.id}[^0-9]').first()
            if role:
                return json_response(error=f'账户角色【{role.name}】的主机权限关联该分组，请解除关联后再尝试删除')
            group.delete()
        return json_response(error=error)
