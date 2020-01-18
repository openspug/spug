# Copyright: (c) OpenSpug Organization. https://github.com/openspug/spug
# Copyright: (c) <spug.dev@gmail.com>
# Released under the MIT License.
from django.db import models
from libs import ModelMixin, human_datetime
from apps.account.models import User


class Environment(models.Model, ModelMixin):
    name = models.CharField(max_length=50)
    key = models.CharField(max_length=50)
    desc = models.CharField(max_length=255, null=True)
    created_at = models.CharField(max_length=20, default=human_datetime)
    created_by = models.ForeignKey(User, on_delete=models.PROTECT)

    def __repr__(self):
        return f'<Environment {self.name!r}>'

    class Meta:
        db_table = 'environments'
        ordering = ('-id',)


class Service(models.Model, ModelMixin):
    name = models.CharField(max_length=50)
    key = models.CharField(max_length=50, unique=True)
    desc = models.CharField(max_length=255, null=True)
    created_at = models.CharField(max_length=20, default=human_datetime)
    created_by = models.ForeignKey(User, on_delete=models.PROTECT)

    def __repr__(self):
        return f'<Service {self.name!r}>'

    class Meta:
        db_table = 'services'
        ordering = ('-id',)


class Config(models.Model, ModelMixin):
    TYPES = (
        ('app', 'App'),
        ('src', 'Service')
    )
    type = models.CharField(max_length=5, choices=TYPES)
    o_id = models.IntegerField()
    key = models.CharField(max_length=50)
    env = models.ForeignKey(Environment, on_delete=models.PROTECT)
    value = models.TextField(null=True)
    desc = models.CharField(max_length=255, null=True)
    is_public = models.BooleanField(default=False)
    updated_at = models.CharField(max_length=20)
    updated_by = models.ForeignKey(User, on_delete=models.PROTECT)

    def __repr__(self):
        return f'<Config {self.key!r}>'

    class Meta:
        db_table = 'configs'
        ordering = ('-key',)


class ConfigHistory(models.Model, ModelMixin):
    ACTIONS = (
        ('1', '新增'),
        ('2', '更新'),
        ('3', '删除')
    )
    type = models.CharField(max_length=5)
    o_id = models.IntegerField()
    key = models.CharField(max_length=50)
    env_id = models.IntegerField()
    value = models.TextField(null=True)
    desc = models.CharField(max_length=255, null=True)
    is_public = models.BooleanField()
    old_value = models.TextField(null=True)
    action = models.CharField(max_length=2, choices=ACTIONS)
    updated_at = models.CharField(max_length=20)
    updated_by = models.ForeignKey(User, on_delete=models.PROTECT)

    def __repr__(self):
        return f'<ConfigHistory {self.key!r}>'

    class Meta:
        db_table = 'config_histories'
        ordering = ('key',)
