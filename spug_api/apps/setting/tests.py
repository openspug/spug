import json
from unittest.mock import patch

from django.test import RequestFactory, SimpleTestCase

from apps.setting.views import email_test


class EmailTestViewTests(SimpleTestCase):
    def setUp(self):
        self.request = RequestFactory().post(
            '/setting/email_test/',
            data=json.dumps({
                'server': 'smtp.example.com',
                'port': 465,
                'username': 'ops@example.com',
                'password': 'authorization-code',
                'nickname': 'Spug Ops',
            }),
            content_type='application/json',
        )

    @patch('apps.setting.views.Mail')
    def test_sends_test_message_to_smtp_account(self, mail_cls):
        response = email_test.__wrapped__(self.request)

        payload = json.loads(response.content)
        self.assertEqual(payload['error'], '')
        mail_cls.assert_called_once_with(
            server='smtp.example.com',
            port=465,
            username='ops@example.com',
            password='authorization-code',
            nickname='Spug Ops',
        )
        mail_cls.return_value.send_text_mail.assert_called_once_with(
            ['ops@example.com'],
            'Spug 邮件服务测试',
            '这是一封来自 Spug 的测试邮件，收到此邮件表示邮件服务配置正常。',
        )

    @patch('apps.setting.views.Mail')
    def test_returns_smtp_send_error(self, mail_cls):
        mail_cls.return_value.send_text_mail.side_effect = RuntimeError('smtp rejected message')

        response = email_test.__wrapped__(self.request)

        payload = json.loads(response.content)
        self.assertEqual(payload['error'], 'smtp rejected message')
