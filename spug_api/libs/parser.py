# Copyright: (c) OpenSpug Organization. https://github.com/openspug/spug
# Copyright: (c) <spug.dev@gmail.com>
# Released under the MIT License.
import json

from .utils import AttrDict


# 自定义的解析异常
class ParseError(BaseException):
    def __init__(self, message):
        self.message = message


# 需要校验的参数对象
class Argument(object):
    """
    :param name: name of option
    :param default: default value if the argument if absent
    :param bool required: is required
    """

    def __init__(self, name, default=None, handler=None, required=True, type=str, filter=None, help=None,
                 nullable=False):
        self.name = name
        self.default = default
        self.type = type
        self.required = required
        self.nullable = nullable
        self.filter = filter
        self.help = help
        self.handler = handler
        if not isinstance(self.name, str):
            raise TypeError('Argument name must be string')
        if filter and not callable(self.filter):
            raise TypeError('Argument filter is not callable')

    def parse(self, has_key, value):
        if not has_key:
            if self.required and self.default is None:
                raise ParseError(
                    self.help or 'Required Error: %s is required' % self.name)
            else:
                return self.default
        elif value in [u'', '', None]:
            if self.default is not None:
                return self.default
            elif not self.nullable and self.required:
                raise ParseError(
                    self.help or 'Value Error: %s must not be null' % self.name)
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
            raise ParseError(self.help or 'Type Error: %s type must be %s' % (
                self.name, self.type))

        if self.filter:
            if not self.filter(value):
                raise ParseError(
                    self.help or 'Value Error: %s filter check failed' % self.name)
        if self.handler:
            value = self.handler(value)
        return value


# 解析器基类
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

    def parse(self, data=None, clear=False):
        rst = AttrDict()
        try:
            self._init(data)
            for e in self.args:
                has_key, value = self._get(e.name)
                if clear and has_key is False and e.required is False:
                    continue
                rst[e.name] = e.parse(has_key, value)
        except ParseError as err:
            return None, err.message
        return rst, None


# Json解析器
class JsonParser(BaseParser):
    def __init__(self, *args):
        self.__data = None
        super(JsonParser, self).__init__(*args)

    def _get(self, key):
        return key in self.__data, self.__data.get(key)

    def _init(self, data):
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
