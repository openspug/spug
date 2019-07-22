from flask import jsonify, request
from public import db
from datetime import datetime
from queue import Queue
import ipaddress
import json
import time


def human_time(date=None):
    if date:
        assert isinstance(date, datetime)
    else:
        date = datetime.now()
    return date.strftime('%Y-%m-%d %H:%M:%S')


def human_diff_time(time1, time2):
    if not (isinstance(time1, datetime) and isinstance(time2, datetime)):
        raise TypeError('Expect a datetime.datetime value')
    delta = time1 - time2 if time1 > time2 else time2 - time1
    if delta.seconds < 60:
        text = '%d秒' % delta.seconds
    elif delta.seconds < 3600:
        text = '%d分' % (delta.seconds / 60)
    else:
        text = '%d小时' % (delta.seconds / 3600)
    return '%d天%s' % (delta.days, text) if delta.days else text


def is_valid_ip(*address):
    try:
        for ip in address:
            ipaddress.ip_address(ip)
        return True
    except ValueError:
        return False


def json_response(data='', message=''):
    if message:
        return jsonify({'data': '', 'message': message})
    if isinstance(data, list) and all([hasattr(x, 'to_json') for x in data]):
        data = [x.to_json() for x in data]
    elif isinstance(data, db.Model) and hasattr(data, 'to_json'):
        data = data.to_json()
    return jsonify({'data': data, 'message': message})


class ParseError(BaseException):
    def __init__(self, message):
        self.message = message


class AttrDict(dict):
    def __setattr__(self, key, value):
        self.__setitem__(key, value)

    def __getattr__(self, item):
        return self.__getitem__(item)

    def __delattr__(self, item):
        self.__delitem__(item)


class Argument(object):
    """
    :param name: name of option
    :param default: default value if the argument if absent
    :param bool required: is required
    """

    def __init__(self, name, default=None, required=True, type=None, filter=None, help=None, nullable=False):
        self.name = name
        self.default = default
        self.type = type
        self.required = required
        self.nullable = nullable
        self.filter = filter
        self.help = help
        if not isinstance(self.name, str):
            raise TypeError('Argument name must be string')
        if filter and not callable(self.filter):
            raise TypeError('Argument filter is not callable')

    def parse(self, has_key, value):
        if not has_key:
            if self.required and self.default is None:
                raise ParseError(self.help or 'Required Error: %s is required' % self.name)
            else:
                return self.default
        elif value in [u'', '', None]:
            if self.default is not None:
                return self.default
            elif not self.nullable and self.required:
                raise ParseError(self.help or 'Value Error: %s must not be null' % self.name)
            else:
                return None
        try:
            if self.type:
                if self.type in (list, dict) and isinstance(value, str):
                    value = json.loads(value)
                    assert isinstance(value, self.type)
                elif self.type == bool and isinstance(value, str):
                    assert value.lower() in ['true', 'false']
                    value = value.lower() == 'true'
                elif not isinstance(value, self.type):
                    value = self.type(value)
        except (TypeError, ValueError, AssertionError):
            raise ParseError(self.help or 'Type Error: %s type must be %s' % (self.name, self.type))

        if self.filter:
            if not self.filter(value):
                raise ParseError(self.help or 'Value Error: %s filter check failed' % self.name)
        return value


class BaseParser(object):
    def __init__(self, *args):
        self.args = []
        for e in args:
            if isinstance(e, str):
                e = Argument(e)
            elif not isinstance(e, Argument):
                raise TypeError('%r is not instance of Argument' % e)
            self.args.append(e)

    def _get(self, key):
        raise NotImplementedError

    def _init(self, data):
        raise NotImplementedError

    def add_argument(self, **kwargs):
        self.args.append(Argument(**kwargs))

    def parse(self, data=None):
        rst = AttrDict()
        try:
            self._init(data)
            for e in self.args:
                rst[e.name] = e.parse(*self._get(e.name))
        except ParseError as err:
            return None, err.message
        return rst, None


class JsonParser(BaseParser):
    def __init__(self, *args):
        self.__data = None
        super(JsonParser, self).__init__(*args)

    def _get(self, key):
        return key in self.__data, self.__data.get(key)

    def _init(self, data):
        if data is None:
            self.__data = request.args.to_dict()
            post_json = request.get_json()
            if isinstance(post_json, dict):
                self.__data.update(post_json or {})
        else:
            try:
                if isinstance(data, (str, bytes)):
                    data = data.decode('utf-8')
                    self.__data = json.loads(data) if data else {}
                else:
                    assert hasattr(data, '__contains__')
                    assert hasattr(data, 'get')
                    assert callable(data.get)
                    self.__data = data
            except (ValueError, AssertionError):
                raise ParseError('Invalid data type for parse')


class WarpQueue(Queue):
    def __init__(self, task_count, *args, **kwargs):
        # 每个队列的生命周期最大为30分钟
        self.expired_time = time.time() + 30 * 60
        self.task_count = task_count
        # 支持设置destroyed关键字参数，用于销毁队列前进行自定义操作
        destroyed = kwargs.pop('destroyed', [])
        if not all([callable(x) for x in destroyed]):
            raise TypeError('destroyed does not callable')
        self.destroyed = destroyed
        super().__init__(*args, **kwargs)

    @property
    def finished(self):
        # 超过生命周期或者任务完成后将被移除
        return time.time() > self.expired_time or self.task_count <= 0

    def done(self):
        self.task_count -= 1

    def destroy(self):
        for f in self.destroyed:
            f()


class CommonQueue(object):
    def __init__(self):
        self._queues = dict()

    def make_queue(self, token, task_count, *args, **kwargs):
        self.remove_queue()
        q = WarpQueue(task_count, *args, **kwargs)
        self._queues[token] = q
        return q

    def get_queue(self, token):
        return self._queues.get(token)

    def remove_queue(self, token=None):
        if token:
            q = self._queues.pop(token, None)
            if q:
                q.destroy()
            return
        for t, q in [(t, q) for t, q in self._queues.items() if q.finished]:
            q.destroy()
            self._queues.pop(t)


QueuePool = CommonQueue()
