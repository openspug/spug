# Copyright: (c) OpenSpug Organization. https://github.com/openspug/spug
# Released under the AGPL-3.0 License.
from unittest.mock import patch

from django.test import TestCase

from apps.account.models import User
from apps.app.models import App
from apps.config.models import Config, ConfigHistory, Environment, Service
from apps.config.utils import update_config_by_var


class UpdateConfigByVarTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.user = User.objects.create(username='tester', nickname='Tester')
        cls.env = Environment.objects.create(name='Production', key='prod', created_by=cls.user)
        cls.app = App.objects.create(name='Application', key='app', created_by=cls.user)
        cls.service = Service.objects.create(name='Service', key='service', created_by=cls.user)

    def targets(self):
        return (('app', self.app), ('src', self.service))

    def create_config(self, config_type, target, value='old'):
        return Config.objects.create(
            type=config_type, o_id=target.id, env=self.env, key='VERSION', value=value,
            desc='Original description', updated_at='2026-01-01 00:00:00', updated_by=self.user)

    def assert_history_matches(self, config, action, old_value=None):
        history = ConfigHistory.objects.get(type=config.type, o_id=config.o_id, key=config.key)
        self.assertEqual(history.action, action)
        self.assertEqual(history.old_value, old_value)
        self.assertEqual(history.to_dict(excludes=('id', 'action', 'old_value')),
                         config.to_dict(excludes=('id',)))

    def test_updates_existing_config_and_history(self):
        for config_type, target in self.targets():
            with self.subTest(config_type=config_type):
                config = self.create_config(config_type, target)

                with patch('apps.config.utils.human_datetime', return_value='2026-02-01 00:00:00'):
                    update_config_by_var(f'{target.key}:prod:VERSION=new=value')

                config.refresh_from_db()
                self.assertEqual(config.value, 'new=value')
                self.assertEqual(config.updated_at, '2026-02-01 00:00:00')
                self.assertIsNone(config.updated_by_id)
                self.assertEqual(config.desc, '通过SPUG_SET动态更新')
                self.assert_history_matches(config, '2', old_value='old')

    def test_creates_config_and_history(self):
        for config_type, target in self.targets():
            with self.subTest(config_type=config_type):
                update_config_by_var(f'{target.key}:prod:VERSION=new')

                config = Config.objects.get(type=config_type, o_id=target.id, key='VERSION')
                self.assertEqual(config.env_id, self.env.id)
                self.assertEqual(config.value, 'new')
                self.assertIsNone(config.updated_by_id)
                self.assertEqual(config.desc, '通过SPUG_SET动态创建')
                self.assert_history_matches(config, '1')

    def test_same_value_preserves_config_without_history(self):
        for config_type, target in self.targets():
            with self.subTest(config_type=config_type):
                config = self.create_config(config_type, target)
                original = config.to_dict()

                update_config_by_var(f'{target.key}:prod:VERSION=old')

                config.refresh_from_db()
                self.assertEqual(config.to_dict(), original)
                self.assertFalse(ConfigHistory.objects.exists())

    def test_update_rolls_back_if_history_creation_fails(self):
        for config_type, target in self.targets():
            with self.subTest(config_type=config_type):
                config = self.create_config(config_type, target)
                original = config.to_dict()

                with patch.object(ConfigHistory.objects, 'create', side_effect=RuntimeError('history unavailable')):
                    with self.assertRaisesMessage(RuntimeError, 'history unavailable'):
                        update_config_by_var(f'{target.key}:prod:VERSION=new')

                config.refresh_from_db()
                self.assertEqual(config.to_dict(), original)
                self.assertFalse(ConfigHistory.objects.exists())

    def test_creation_rolls_back_if_history_creation_fails(self):
        for config_type, target in self.targets():
            with self.subTest(config_type=config_type):
                with patch.object(ConfigHistory.objects, 'create', side_effect=RuntimeError('history unavailable')):
                    with self.assertRaisesMessage(RuntimeError, 'history unavailable'):
                        update_config_by_var(f'{target.key}:prod:VERSION=new')

                self.assertFalse(Config.objects.filter(type=config_type, o_id=target.id).exists())
                self.assertFalse(ConfigHistory.objects.exists())
