from flask import Blueprint, request
from libs.tools import json_response, JsonParser, Argument
from .models import NotifyWay
from libs.decorators import require_permission
from libs.utils import send_ding_ding


blueprint = Blueprint(__name__, __name__)


@blueprint.route('/', methods=['GET'])
@require_permission('system_notify_view | system_notify_add | system_notify_edit | system_notify_del')
def get():
    form, error = JsonParser(Argument('page', type=int, default=1, required=False),
                             Argument('pagesize', type=int, default=10, required=False),
                             Argument('notify_query', type=dict, required=False), ).parse(request.args)
    if error is None:
        notify_data = NotifyWay.query
        if form.page == -1:
            return json_response({'data': [x.to_json() for x in notify_data.all()], 'total': -1})
        if form.notify_query.get('name_field'):
            notify_data = notify_data.filter(NotifyWay.name.like('%{}%'.format(form.notify_query['name_field'])))

        result = notify_data.limit(form.pagesize).offset((form.page - 1) * form.pagesize).all()
        return json_response({'data': [x.to_json() for x in result], 'total': notify_data.count()})
    return json_response(message=error)


@blueprint.route('/', methods=['POST'])
@require_permission('system_notify_add')
def post():
    form, error = JsonParser('name', 'value',
                             Argument('desc', nullable=True)).parse()
    if error is None:
        notify_is_exist = NotifyWay.query.filter_by(name=form.name).first()
        if notify_is_exist:
            return json_response(message="通知名称已存在")
        NotifyWay(**form).save()
        return json_response()
    return json_response(message=error)


@blueprint.route('/<int:u_id>', methods=['DELETE'])
@require_permission('system_notify_del')
def delete(u_id):
    NotifyWay.query.get_or_404(u_id).delete()
    return json_response(), 204


@blueprint.route('/<int:n_id>', methods=['PUT'])
@require_permission('system_notify_edit')
def put(n_id):
    form, error = JsonParser('name', 'value',
                             Argument('desc', nullable=True)).parse()

    if error is None:
        notify_info = NotifyWay.query.get_or_404(n_id)
        if not notify_info.update(**form):
            notify_info.save()
        return json_response(notify_info)
    return json_response(message=error)


@blueprint.route('/test/<int:d_id>', methods=['POST'])
def send_ding_test(d_id):
    if d_id:
        notice_value = NotifyWay.query.filter_by(id=d_id).first()
        message = f'# <font face=\"微软雅黑\">运维平台通知</font> #  \n ' \
                  '**平台地址:**  http://spug.qbangmang.com \n  \n ' \
                  '**测试状态:**  <font color=\"#85CE60\">测试成功</font><br /> \n \n '

        send_ding_ding(token_url=notice_value.value, contacts=[], msg=message)
        return json_response()
