# Copyright: (c) OpenSpug Organization. https://github.com/openspug/spug
# Copyright: (c) <spug.dev@gmail.com>
# Released under the AGPL-3.0 License.
from apps.host.models import Group


def get_host_perms(user):
    ids = sub_ids = set(user.group_perms)
    while sub_ids:
        sub_ids = [x.id for x in Group.objects.filter(parent_id__in=sub_ids)]
        ids.update(sub_ids)
    return set(x.host_id for x in Group.hosts.through.objects.filter(group_id__in=ids))


def has_host_perm(user, target):
    if user.is_supper:
        return True
    host_ids = get_host_perms(user)
    if isinstance(target, (list, set, tuple)):
        return set(target).issubset(host_ids)
    return int(target) in host_ids
