from django.db import models


class Setting(models.Model):
    key = models.CharField(max_length=50, unique=True)
    value = models.TextField()
    desc = models.CharField(max_length=255, null=True)

    def __repr__(self):
        return '<Setting %r>' % self.key

    class Meta:
        db_table = 'settings'
