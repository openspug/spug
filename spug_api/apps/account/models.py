from django.db import models
from libs import ModelMixin, human_datetime
from django.contrib.auth.hashers import make_password, check_password


class User(models.Model, ModelMixin):
    username = models.CharField(max_length=100, unique=True)
    nickname = models.CharField(max_length=100)
    password_hash = models.CharField(max_length=100)  # hashed password
    is_supper = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    access_token = models.CharField(max_length=32)
    token_expired = models.IntegerField(null=True)
    last_login = models.CharField(max_length=20)

    created_at = models.CharField(max_length=20, default=human_datetime)
    created_by = models.ForeignKey('User', models.PROTECT, related_name='+', null=True)
    deleted_at = models.CharField(max_length=20, null=True)
    deleted_by = models.ForeignKey('User', models.PROTECT, related_name='+', null=True)

    @staticmethod
    def make_password(plain_password: str) -> str:
        return make_password(plain_password, hasher='pbkdf2_sha256')

    def verify_password(self, plain_password: str) -> bool:
        return check_password(plain_password, self.password_hash)

    def has_perms(self, codes):
        # return self.is_supper or self.role in codes
        return self.is_supper

    def __repr__(self):
        return '<User %r>' % self.username

    class Meta:
        db_table = 'users'
        ordering = ('-id',)
