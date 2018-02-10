# coding=utf-8
from flask import request, make_response, g
from libs.tools import json_response
from apps.account.models import User
from public import app
import time
import flask_excel as excel


def init_app(app):
    excel.init_excel(app)
    app.before_request(cross_domain_access_before)
    app.before_request(auth_middleware)
    app.after_request(cross_domain_access_after)
    app.register_error_handler(Exception, exception_handler)
    app.register_error_handler(404, page_not_found)


def cross_domain_access_before():
    if request.method == 'OPTIONS':
        response = make_response()
        response.headers['Access-Control-Allow-Origin'] = '*'
        response.headers['Access-Control-Allow-Headers'] = 'X-TOKEN'
        response.headers['Access-Control-Max-Age'] = 24 * 60 * 60
        response.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE'
        return response


def cross_domain_access_after(response):
    response.headers['Access-Control-Allow-Origin'] = '*'
    response.headers['Access-Control-Allow-Headers'] = 'Content-Type, X-TOKEN'
    return response


def page_not_found(_):
    return json_response(message='Resource not found'), 404


def exception_handler(ex):
    app.logger.exception(ex)
    message = '%s' % ex
    if len(message) > 60:
        message = message[:60] + '...'
    return json_response(message=message)


def auth_middleware():
    if request.path == '/account/users/login/' or request.path.startswith('/apis/configs/') \
            or request.path.startswith('/apis/files/'):
        return None
    token = request.headers.get('X-TOKEN')
    if token and len(token) == 32:
        g.user = User.query.filter_by(access_token=token).first()
        if g.user and g.user.is_active and g.user.token_expired >= time.time():
            g.user.token_expired = time.time() + 8 * 60 * 60
            g.user.save()
            return None
    return json_response(message='Auth fail, please login'), 401
