from django.db import models
from libs import ModelMixin, human_time
from apps.account.models import User
from apps.config.models import Environment
import json


class App(models.Model, ModelMixin):
    EXTENDS = (
        ('1', '常规发布'),
        ('2', '自定义发布'),
    )
    name = models.CharField(max_length=50)
    env = models.ForeignKey(Environment, on_delete=models.PROTECT)
    host_ids = models.TextField()
    extend = models.CharField(max_length=2, choices=EXTENDS)
    is_audit = models.BooleanField()

    created_at = models.CharField(max_length=20, default=human_time)
    created_by = models.ForeignKey(User, models.PROTECT, related_name='+')
    updated_at = models.CharField(max_length=20, null=True)
    updated_by = models.ForeignKey(User, models.PROTECT, related_name='+', null=True)

    @property
    def extend_obj(self):
        cls = AppExtend1 if self.extend == '1' else AppExtend2
        return cls.objects.filter(app=self).first()

    def to_dict(self, *args, **kwargs):
        app = super().to_dict(*args, **kwargs)
        app['host_ids'] = json.loads(self.host_ids)
        app.update(self.extend_obj.to_dict())
        return app

    def __repr__(self):
        return '<App %r>' % self.name

    class Meta:
        db_table = 'apps'
        ordering = ('-id',)


class AppExtend1(models.Model, ModelMixin):
    GIT_TYPES = (
        ('tag', 'tag'),
        ('branch', 'branch')
    )
    app = models.OneToOneField(App, primary_key=True, on_delete=models.CASCADE)
    git_repo = models.CharField(max_length=255)
    git_type = models.CharField(max_length=10, choices=GIT_TYPES)
    dst_dir = models.CharField(max_length=255)
    dst_repo = models.CharField(max_length=255)
    versions = models.IntegerField()
    filter_rule = models.TextField()
    custom_envs = models.TextField()
    hook_pre_server = models.TextField(null=True)
    hook_post_server = models.TextField(null=True)
    hook_pre_host = models.TextField(null=True)
    hook_post_host = models.TextField(null=True)

    def to_dict(self, *args, **kwargs):
        tmp = super().to_dict(*args, **kwargs)
        tmp['filter_rule'] = json.loads(self.filter_rule)
        tmp['custom_envs'] = '\n'.join(f'{k}={v}' for k, v in json.loads(self.custom_envs).items())
        return tmp

    def __repr__(self):
        return '<AppExtend1 app_id=%r>' % self.app_id

    class Meta:
        db_table = 'app_extend1'


class AppExtend2(models.Model, ModelMixin):
    app = models.OneToOneField(App, primary_key=True, on_delete=models.CASCADE)
    actions = models.TextField()

    def __repr__(self):
        return '<AppExtend2 app_id=%r>' % self.app_id

    class Meta:
        db_table = 'app_extend2'
