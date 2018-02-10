from flask import g
from public import app
from functools import wraps
from libs.tools import json_response


def with_app_context(func):
    @wraps(func)
    def wrapper(*args, **kwargs):
        with app.app_context():
            return func(*args, **kwargs)

    return wrapper


def require_permission(str_code):
    def decorate(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            if not g.user.is_supper:
                or_list = [x.strip() for x in str_code.split('|')]
                for or_item in or_list:
                    and_set = {x.strip() for x in or_item.split('&')}
                    if and_set.issubset(g.user.permissions):
                        break
                else:
                    return json_response(message='Permission denied'), 403
            return func(*args, **kwargs)

        return wrapper

    return decorate
