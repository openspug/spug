from base64 import urlsafe_b64encode
from hashlib import sha256

from cryptography.fernet import Fernet, InvalidToken
from django.conf import settings
from django.db import models

from apps.account.models import User
from libs import ModelMixin


def _cipher():
    key = sha256(settings.SECRET_KEY.encode('utf-8')).digest()
    return Fernet(urlsafe_b64encode(key))


class DatabaseConnection(models.Model, ModelMixin):
    TYPES = (
        ('mysql', 'MySQL'),
        ('mariadb', 'MariaDB'),
        ('postgresql', 'PostgreSQL'),
        ('clickhouse', 'ClickHouse'),
        ('redis', 'Redis'),
    )
    DEFAULT_PORTS = {
        'mysql': 3306,
        'mariadb': 3306,
        'postgresql': 5432,
        'clickhouse': 8123,
        'redis': 6379,
    }

    name = models.CharField(max_length=64, unique=True)
    type = models.CharField(max_length=20, choices=TYPES)
    host = models.CharField(max_length=255)
    port = models.PositiveIntegerField()
    username = models.CharField(max_length=128, blank=True, default='')
    password = models.TextField(blank=True, default='')
    database = models.CharField(max_length=128, blank=True, default='')
    use_ssl = models.BooleanField(default=False)
    created_by = models.ForeignKey(User, on_delete=models.PROTECT, related_name='+')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def set_password(self, value):
        self.password = _cipher().encrypt((value or '').encode('utf-8')).decode('ascii')

    def get_password(self):
        if not self.password:
            return ''
        try:
            return _cipher().decrypt(self.password.encode('ascii')).decode('utf-8')
        except (InvalidToken, ValueError):
            # 兼容已有明文数据，下一次保存时会自动转为密文。
            return self.password

    def to_view(self):
        data = self.to_dict(excludes=('password',))
        data['type_alias'] = self.get_type_display()
        data['has_password'] = bool(self.password)
        return data

    class Meta:
        db_table = 'database_connections'
        ordering = ('name', 'id')
