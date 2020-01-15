# Copyright: (c) OpenSpug Organization. https://github.com/openspug/spug
# Copyright: (c) <spug.dev@gmail.com>
# Released under the MIT License.
from .utils import json_response


# 混入类，提供Model实例to_dict方法
class ModelMixin(object):
    __slots__ = ()

    def to_dict(self, excludes: tuple = None, selects: tuple = None) -> dict:
        if not hasattr(self, '_meta'):
            raise TypeError('<%r> does not a django.db.models.Model object.' % self)
        elif selects:
            return {f: getattr(self, f) for f in selects}
        elif excludes:
            return {f.attname: getattr(self, f.attname) for f in self._meta.fields if f.attname not in excludes}
        else:
            return {f.attname: getattr(self, f.attname) for f in self._meta.fields}


# 使用该混入类，需要request.user对象实现has_perms方法
class PermissionMixin(object):
    """
    CBV mixin which verifies that the current user has all specified
    permissions.
    """
    permission_required = None

    def get_permission_required(self):
        """
        Override this method to override the permission_required attribute.
        Must return an iterable.
        """
        if self.permission_required is None:
            raise AttributeError(
                '{0} is missing the permission_required attribute. Define {0}.permission_required, or override '
                '{0}.get_permission_required().'.format(self.__class__.__name__)
            )
        if isinstance(self.permission_required, str):
            perms = (self.permission_required,)
        else:
            perms = self.permission_required
        return perms

    def has_permission(self):
        """
        Override this method to customize the way permissions are checked.
        """
        perms = self.get_permission_required()
        return self.request.user.has_perms(perms)

    def dispatch(self, request, *args, **kwargs):
        if not self.has_permission():
            return json_response(error='拒绝访问')
        return super(PermissionMixin, self).dispatch(request, *args, **kwargs)
