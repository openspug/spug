from django.db import migrations, models
import django.db.models.deletion
import libs.mixins


class Migration(migrations.Migration):
    initial = True

    dependencies = [('account', '0001_initial')]

    operations = [
        migrations.CreateModel(
            name='DatabaseConnection',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=64, unique=True)),
                ('type', models.CharField(choices=[('mysql', 'MySQL'), ('mariadb', 'MariaDB'), ('postgresql', 'PostgreSQL'), ('clickhouse', 'ClickHouse'), ('redis', 'Redis')], max_length=20)),
                ('host', models.CharField(max_length=255)),
                ('port', models.PositiveIntegerField()),
                ('username', models.CharField(blank=True, default='', max_length=128)),
                ('password', models.TextField(blank=True, default='')),
                ('database', models.CharField(blank=True, default='', max_length=128)),
                ('use_ssl', models.BooleanField(default=False)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('created_by', models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name='+', to='account.user')),
            ],
            options={'db_table': 'database_connections', 'ordering': ('name', 'id')},
            bases=(models.Model, libs.mixins.ModelMixin),
        ),
    ]
