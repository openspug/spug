from django.db import models
from libs import ModelMixin, human_time
from apps.account.models import User


class Environment(models.Model, ModelMixin):
    name = models.CharField(max_length=50)
    key = models.CharField(max_length=50)
    desc = models.CharField(max_length=255, null=True)
    created_at = models.CharField(max_length=20, default=human_time)
    created_by = models.ForeignKey(User, on_delete=models.PROTECT)

    def __repr__(self):
        return f'<Environment {self.name!r}>'

    class Meta:
        db_table = 'environments'
        ordering = ('-id',)


class Service(models.Model, ModelMixin):
    name = models.CharField(max_length=50)
    key = models.CharField(max_length=50)
    desc = models.CharField(max_length=255, null=True)
    created_at = models.CharField(max_length=20, default=human_time)
    created_by = models.ForeignKey(User, on_delete=models.PROTECT)

    def __repr__(self):
        return f'<Service {self.name!r}>'

    class Meta:
        db_table = 'services'
        ordering = ('-id',)


class ConfigKey(models.Model, ModelMixin):
    TYPES = (
        ('app', 'App'),
        ('src', 'Service')
    )
    name = models.CharField(max_length=50)
    type = models.CharField(max_length=5, choices=TYPES)
    o_id = models.IntegerField()
    is_public = models.BooleanField()

    def __repr__(self):
        return f'<ConfigKey {self.name!r}>'

    class Meta:
        db_table = 'config_keys'


class ConfigValue(models.Model, ModelMixin):
    env = models.ForeignKey(Environment, on_delete=models.PROTECT)
    key = models.ForeignKey(ConfigKey, on_delete=models.PROTECT)
    value = models.TextField()

    def __repr__(self):
        return f'<ConfigValue {self.id!r}>'

    class Meta:
        db_table = 'config_values'


class ConfigHistory(models.Model, ModelMixin):
    ACTIONS = (
        ('1', '新增'),
        ('2', '更新'),
        ('3', '删除')
    )
    key = models.CharField(max_length=50)
    old_value = models.TextField(null=True)
    new_value = models.TextField(null=True)
    action = models.CharField(max_length=2, choices=ACTIONS)
    created_at = models.CharField(max_length=20, default=human_time)
    created_by = models.ForeignKey(User, on_delete=models.PROTECT)

    def __repr__(self):
        return f'<ConfigHistory {self.key!r}>'

    class Meta:
        db_table = 'config_histories'
