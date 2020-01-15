# Copyright: (c) OpenSpug Organization. https://github.com/openspug/spug
# Copyright: (c) <spug.dev@gmail.com>
# Released under the MIT License.
from django.db import models
from libs import ModelMixin, human_datetime
from apps.account.models import User
from apps.config.models import Environment
import json


class App(models.Model, ModelMixin):
    name = models.CharField(max_length=50)
    key = models.CharField(max_length=50, unique=True)
    desc = models.CharField(max_length=255, null=True)
    rel_apps = models.TextField(null=True)
    rel_services = models.TextField(null=True)
    created_at = models.CharField(max_length=20, default=human_datetime)
    created_by = models.ForeignKey(User, on_delete=models.PROTECT)

    def to_dict(self, *args, **kwargs):
        tmp = super().to_dict(*args, **kwargs)
        tmp['rel_apps'] = json.loads(self.rel_apps) if self.rel_apps else []
        tmp['rel_services'] = json.loads(self.rel_services) if self.rel_services else []
        return tmp

    def __repr__(self):
        return f'<App {self.name!r}>'

    class Meta:
        db_table = 'apps'
        ordering = ('-id',)


class Deploy(models.Model, ModelMixin):
    EXTENDS = (
        ('1', '常规发布'),
        ('2', '自定义发布'),
    )
    app = models.ForeignKey(App, on_delete=models.PROTECT)
    env = models.ForeignKey(Environment, on_delete=models.PROTECT)
    host_ids = models.TextField()
    extend = models.CharField(max_length=2, choices=EXTENDS)
    is_audit = models.BooleanField()

    created_at = models.CharField(max_length=20, default=human_datetime)
    created_by = models.ForeignKey(User, models.PROTECT, related_name='+')
    updated_at = models.CharField(max_length=20, null=True)
    updated_by = models.ForeignKey(User, models.PROTECT, related_name='+', null=True)

    @property
    def extend_obj(self):
        cls = DeployExtend1 if self.extend == '1' else DeployExtend2
        return cls.objects.filter(deploy=self).first()

    def to_dict(self, *args, **kwargs):
        deploy = super().to_dict(*args, **kwargs)
        deploy['app_name'] = self.app_name if hasattr(self, 'app_name') else None
        deploy['host_ids'] = json.loads(self.host_ids)
        deploy.update(self.extend_obj.to_dict())
        return deploy

    def __repr__(self):
        return '<Deploy app_id=%r>' % self.app_id

    class Meta:
        db_table = 'deploys'
        ordering = ('-id',)


class DeployExtend1(models.Model, ModelMixin):
    deploy = models.OneToOneField(Deploy, primary_key=True, on_delete=models.CASCADE)
    git_repo = models.CharField(max_length=255)
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
        return '<DeployExtend1 deploy_id=%r>' % self.deploy_id

    class Meta:
        db_table = 'deploy_extend1'


class DeployExtend2(models.Model, ModelMixin):
    deploy = models.OneToOneField(Deploy, primary_key=True, on_delete=models.CASCADE)
    server_actions = models.TextField()
    host_actions = models.TextField()

    def to_dict(self, *args, **kwargs):
        tmp = super().to_dict(*args, **kwargs)
        tmp['server_actions'] = json.loads(self.server_actions)
        tmp['host_actions'] = json.loads(self.host_actions)
        return tmp

    def __repr__(self):
        return '<DeployExtend2 deploy_id=%r>' % self.deploy_id

    class Meta:
        db_table = 'deploy_extend2'
