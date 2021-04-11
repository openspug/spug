# Copyright: (c) OpenSpug Organization. https://github.com/openspug/spug
# Copyright: (c) <spug.dev@gmail.com>
# Released under the AGPL-3.0 License.
from django.db import models
from libs import ModelMixin, human_datetime
from apps.account.models import User
from apps.setting.utils import AppSetting
from libs.ssh import SSH


class Host(models.Model, ModelMixin):
    name = models.CharField(max_length=50)
    hostname = models.CharField(max_length=50)
    port = models.IntegerField()
    username = models.CharField(max_length=50)
    pkey = models.TextField(null=True)
    desc = models.CharField(max_length=255, null=True)
    created_at = models.CharField(max_length=20, default=human_datetime)
    created_by = models.ForeignKey(User, models.PROTECT, related_name='+')

    @property
    def private_key(self):
        return self.pkey or AppSetting.get('private_key')

    def get_ssh(self, pkey=None):
        pkey = pkey or self.private_key
        return SSH(self.hostname, self.port, self.username, pkey)

    def to_view(self):
        tmp = self.to_dict()
        tmp['group_ids'] = []
        return tmp

    def __repr__(self):
        return '<Host %r>' % self.name

    class Meta:
        db_table = 'hosts'
        ordering = ('-id',)


class HostExtend(models.Model, ModelMixin):
    INSTANCE_CHARGE_TYPES = (
        ('PrePaid', '包年包月'),
        ('PostPaid', '按量付费'),
        ('Other', '其他')
    )
    INTERNET_CHARGE_TYPES = (
        ('PayByTraffic', '按流量计费'),
        ('PayByBandwidth', '按带宽计费'),
        ('Other', '其他')
    )
    host = models.OneToOneField(Host, on_delete=models.CASCADE)
    instance_id = models.CharField(max_length=64)
    zone_id = models.CharField(max_length=30)
    cpu = models.IntegerField()
    memory = models.FloatField()
    disk = models.CharField(max_length=255)
    os_name = models.CharField(max_length=50)
    os_type = models.CharField(max_length=20)
    private_ip_address = models.CharField(max_length=255)
    public_ip_address = models.CharField(max_length=255)
    instance_charge_type = models.CharField(max_length=20, choices=INSTANCE_CHARGE_TYPES)
    internet_charge_type = models.CharField(max_length=20, choices=INTERNET_CHARGE_TYPES)
    created_time = models.CharField(max_length=20)
    expired_time = models.CharField(max_length=20, null=True)
    updated_at = models.CharField(max_length=20, default=human_datetime)

    class Meta:
        db_table = 'host_extend'


class Group(models.Model, ModelMixin):
    name = models.CharField(max_length=20)
    parent_id = models.IntegerField(default=0)
    sort_id = models.IntegerField(default=0)
    hosts = models.ManyToManyField(Host, related_name='groups')

    def to_view(self, with_hosts=False):
        response = dict(key=self.id, value=self.id, title=self.name, children=[])
        if with_hosts:
            def make_item(x):
                return dict(title=x.name, key=f'{self.id}_{x.id}', id=x.id, isLeaf=True)

            response['children'] = [make_item(x) for x in self.hosts.all()]
        return response

    class Meta:
        db_table = 'host_groups'
        ordering = ('-sort_id',)
