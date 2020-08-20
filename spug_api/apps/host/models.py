# Copyright: (c) OpenSpug Organization. https://github.com/openspug/spug
# Copyright: (c) <spug.dev@gmail.com>
# Released under the AGPL-3.0 License.
from django.db import models
from libs import ModelMixin, human_datetime
from apps.account.models import User
from apps.setting.utils import AppSetting
from libs.ssh import SSH


class Tag(models.Model, ModelMixin):
    name = models.CharField(max_length=30)

    def __str__(self):
        return f'<Tag: {self.name}>'

    class Meta:
        db_table = 'tags'
        ordering = ['name']


class Host(models.Model, ModelMixin):
    name = models.CharField(max_length=50)
    zone = models.CharField(max_length=50)
    tags = models.ManyToManyField(Tag)
    hostname = models.CharField(max_length=50)
    port = models.IntegerField()
    username = models.CharField(max_length=50)
    pkey = models.TextField(null=True)
    desc = models.CharField(max_length=255, null=True)

    created_at = models.CharField(max_length=20, default=human_datetime)
    created_by = models.ForeignKey(User, models.PROTECT, related_name='+')
    deleted_at = models.CharField(max_length=20, null=True)
    deleted_by = models.ForeignKey(User, models.PROTECT, related_name='+', null=True)

    @property
    def private_key(self):
        return self.pkey or AppSetting.get('private_key')

    def get_ssh(self, pkey=None):
        pkey = pkey or self.private_key
        return SSH(self.hostname, self.port, self.username, pkey)

    def to_dict(self):
        res = {f.attname: getattr(self, f.attname) for f in self._meta.fields}
        res['tags'] = []
        for tag in self.tags.all():
            res['tags'].append(tag.name)
        return res

    def update_tags(self, tags):
        for tag in self.tags.all():
            if tag.name not in tags:
                self.tags.remove(tag)
        for tag in tags:
            t, created = Tag.objects.get_or_create(name=tag)
            self.tags.add(t)
        self.save()

    def __repr__(self):
        return '<Host %r>' % self.name

    class Meta:
        db_table = 'hosts'
        ordering = ('-id',)
