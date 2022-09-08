# Copyright: (c) OpenSpug Organization. https://github.com/openspug/spug
# Copyright: (c) <spug.dev@gmail.com>
# Released under the AGPL-3.0 License.
from django.db import models
from django.core.cache import cache
from libs import ModelMixin, human_datetime
from django.contrib.auth.hashers import make_password, check_password
import json


class User(models.Model, ModelMixin):
    username = models.CharField(max_length=100)
    nickname = models.CharField(max_length=100)
    password_hash = models.CharField(max_length=100)  # hashed password
    type = models.CharField(max_length=20, default='default')
    is_supper = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    access_token = models.CharField(max_length=32)
    token_expired = models.IntegerField(null=True)
    last_login = models.CharField(max_length=20)
    last_ip = models.CharField(max_length=50)
    wx_token = models.CharField(max_length=50, null=True)
    roles = models.ManyToManyField('Role', db_table='user_role_rel')

    created_at = models.CharField(max_length=20, default=human_datetime)
    created_by = models.ForeignKey('User', models.PROTECT, related_name='+', null=True)
    deleted_at = models.CharField(max_length=20, null=True)
    deleted_by = models.ForeignKey('User', models.PROTECT, related_name='+', null=True)

    @staticmethod
    def make_password(plain_password: str) -> str:
        return make_password(plain_password, hasher='pbkdf2_sha256')

    def verify_password(self, plain_password: str) -> bool:
        return check_password(plain_password, self.password_hash)

    def get_perms_cache(self):
        return cache.get(f'perms_{self.id}', set())

    def set_perms_cache(self, value=None):
        cache.set(f'perms_{self.id}', value or set())

    @property
    def page_perms(self):
        data = self.get_perms_cache()
        if data:
            return data
        for item in self.roles.all():
            if item.page_perms:
                perms = json.loads(item.page_perms)
                for m, v in perms.items():
                    for p, d in v.items():
                        data.update(f'{m}.{p}.{x}' for x in d)
        self.set_perms_cache(data)
        return data

    @property
    def deploy_perms(self):
        data = {'apps': set(), 'envs': set()}
        for item in self.roles.all():
            if item.deploy_perms:
                perms = json.loads(item.deploy_perms)
                data['apps'].update(perms.get('apps', []))
                data['envs'].update(perms.get('envs', []))
        data['apps'].update(x.id for x in self.app_set.all())
        return data

    @property
    def group_perms(self):
        data = set()
        for item in self.roles.all():
            if item.group_perms:
                data.update(json.loads(item.group_perms))
        return list(data)

    def has_perms(self, codes):
        if self.is_supper:
            return True
        return self.page_perms.intersection(codes)

    def __repr__(self):
        return '<User %r>' % self.username

    class Meta:
        db_table = 'users'
        ordering = ('-id',)


class Role(models.Model, ModelMixin):
    name = models.CharField(max_length=50)
    desc = models.CharField(max_length=255, null=True)
    page_perms = models.TextField(null=True)
    deploy_perms = models.TextField(null=True)
    group_perms = models.TextField(null=True)
    created_at = models.CharField(max_length=20, default=human_datetime)
    created_by = models.ForeignKey(User, on_delete=models.PROTECT, related_name='+')

    def to_dict(self, *args, **kwargs):
        tmp = super().to_dict(*args, **kwargs)
        tmp['page_perms'] = json.loads(self.page_perms) if self.page_perms else {}
        tmp['deploy_perms'] = json.loads(self.deploy_perms) if self.deploy_perms else {}
        tmp['group_perms'] = json.loads(self.group_perms) if self.group_perms else []
        tmp['used'] = self.user_set.filter(deleted_by_id__isnull=True).count()
        return tmp

    def add_deploy_perm(self, target, value):
        perms = {'apps': [], 'envs': []}
        if self.deploy_perms:
            perms.update(json.loads(self.deploy_perms))
        perms[target].append(value)
        self.deploy_perms = json.dumps(perms)
        self.save()

    def clear_perms_cache(self):
        for item in self.user_set.all():
            item.set_perms_cache()

    def __repr__(self):
        return '<Role name=%r>' % self.name

    class Meta:
        db_table = 'roles'
        ordering = ('-id',)


class History(models.Model, ModelMixin):
    username = models.CharField(max_length=100, null=True)
    type = models.CharField(max_length=20, default='default')
    ip = models.CharField(max_length=50)
    agent = models.CharField(max_length=255, null=True)
    message = models.CharField(max_length=255, null=True)
    is_success = models.BooleanField(default=True)
    created_at = models.CharField(max_length=20, default=human_datetime)

    class Meta:
        db_table = 'login_histories'
        ordering = ('-id',)
