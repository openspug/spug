# Copyright: (c) OpenSpug Organization. https://github.com/openspug/spug
# Copyright: (c) <spug.dev@gmail.com>
# Released under the AGPL-3.0 License.
from django.db import models
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
    role = models.ForeignKey('Role', on_delete=models.PROTECT, null=True)

    created_at = models.CharField(max_length=20, default=human_datetime)
    created_by = models.ForeignKey('User', models.PROTECT, related_name='+', null=True)
    deleted_at = models.CharField(max_length=20, null=True)
    deleted_by = models.ForeignKey('User', models.PROTECT, related_name='+', null=True)

    @staticmethod
    def make_password(plain_password: str) -> str:
        return make_password(plain_password, hasher='pbkdf2_sha256')

    def verify_password(self, plain_password: str) -> bool:
        return check_password(plain_password, self.password_hash)

    @property
    def page_perms(self):
        if self.role and self.role.page_perms:
            data = []
            perms = json.loads(self.role.page_perms)
            for m, v in perms.items():
                for p, d in v.items():
                    data.extend(f'{m}.{p}.{x}' for x in d)
            return data
        else:
            return []

    @property
    def deploy_perms(self):
        perms = json.loads(self.role.deploy_perms) if self.role and self.role.deploy_perms else {}
        perms.setdefault('apps', [])
        perms.setdefault('envs', [])
        return perms

    @property
    def host_perms(self):
        return json.loads(self.role.host_perms) if self.role and self.role.host_perms else []

    def has_host_perm(self, host_id):
        if isinstance(host_id, (list, set, tuple)):
            return self.is_supper or set(host_id).issubset(set(self.host_perms))
        return self.is_supper or int(host_id) in self.host_perms

    def has_perms(self, codes):
        # return self.is_supper or self.role in codes
        return self.is_supper

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
    host_perms = models.TextField(null=True)

    created_at = models.CharField(max_length=20, default=human_datetime)
    created_by = models.ForeignKey(User, on_delete=models.PROTECT, related_name='+')

    def to_dict(self, *args, **kwargs):
        tmp = super().to_dict(*args, **kwargs)
        tmp['page_perms'] = json.loads(self.page_perms) if self.page_perms else None
        tmp['deploy_perms'] = json.loads(self.deploy_perms) if self.deploy_perms else None
        tmp['host_perms'] = json.loads(self.host_perms) if self.host_perms else None
        tmp['used'] = self.user_set.count()
        return tmp

    def add_deploy_perm(self, target, value):
        perms = {'apps': [], 'envs': []}
        if self.deploy_perms:
            perms.update(json.loads(self.deploy_perms))
        perms[target].append(value)
        self.deploy_perms = json.dumps(perms)
        self.save()

    def add_host_perm(self, value):
        perms = json.loads(self.host_perms) if self.host_perms else []
        perms.append(value)
        self.host_perms = json.dumps(perms)
        self.save()

    def __repr__(self):
        return '<Role name=%r>' % self.name

    class Meta:
        db_table = 'roles'
        ordering = ('-id',)


class History(models.Model, ModelMixin):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    ip = models.CharField(max_length=50)
    created_at = models.CharField(max_length=20, default=human_datetime)

    class Meta:
        db_table = 'login_histories'
        ordering = ('-id',)
