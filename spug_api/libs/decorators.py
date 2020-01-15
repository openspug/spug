# Copyright: (c) OpenSpug Organization. https://github.com/openspug/spug
# Copyright: (c) <spug.dev@gmail.com>
# Released under the MIT License.
from functools import wraps
from .utils import json_response


def permission_required_supper(view_func):
    @wraps(view_func)
    def wrapper(*args, **kwargs):
        request = None
        for item in args:
            if hasattr(item, 'user'):
                request = item
                break
        if request is None or not request.user.is_supper:
            return json_response(error='需要管理员权限')
        return view_func(*args, **kwargs)

    return wrapper


def permission_required(perm_list):
    def decorate(view_func):
        codes = (perm_list,) if isinstance(perm_list, str) else perm_list

        @wraps(view_func)
        def wrapper(*args, **kwargs):
            request = None
            for item in args:
                if hasattr(item, 'user'):
                    request = item
                    break
            if request is None or (not request.user.is_supper and not request.user.has_perms(codes)):
                return json_response(error='拒绝访问')
            return view_func(*args, **kwargs)

        return wrapper

    return decorate
