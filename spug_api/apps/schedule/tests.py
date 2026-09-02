from types import SimpleNamespace
import json
from types import SimpleNamespace
from unittest.mock import patch

from django.test import SimpleTestCase

from apps.schedule.analysis import analyze_history, build_analysis_messages
from apps.schedule.executors import EXIT_UNKNOWN, resolve_status
from apps.schedule.utils import send_task_notify


class ResolveStatusTests(SimpleTestCase):
    def test_all_targets_exiting_zero_is_success(self):
        self.assertEqual(resolve_status({'local': [0, 1.0, 'ok'], '2': [0, 1.0, 'ok']}), 1)

    def test_any_target_reporting_real_failure_is_failed(self):
        self.assertEqual(resolve_status({'local': [0, 1.0, 'ok'], '2': [2, 1.0, 'boom']}), 2)

    def test_unknown_exit_status_is_interrupted_not_failed(self):
        # Paramiko 在通道关闭却未收到 exit-status 时返回 -1，
        # 这表示「退出状态未知」，不能等同于命令自己报告了失败。
        self.assertEqual(resolve_status({'1': [EXIT_UNKNOWN, 302.1, 'full output']}), 3)

    def test_real_failure_takes_precedence_over_unknown_exit_status(self):
        self.assertEqual(
            resolve_status({'1': [EXIT_UNKNOWN, 1.0, 'out'], '2': [1, 1.0, 'err']}), 2)


class TaskNotifyTests(SimpleTestCase):
    def _task(self, mode, value):
        return SimpleNamespace(
            id=7, name='磁盘检查', type='巡检',
            rst_notify=json.dumps({'mode': mode, 'value': value}))

    @patch('apps.schedule.utils.Mail')
    @patch('apps.schedule.utils.AppSetting.get_default', return_value={
        'server': 'smtp.example.com', 'port': 465,
        'username': 'ops@example.com', 'password': 'secret'})
    def test_email_mode_sends_to_configured_receivers(self, _setting, mail_cls):
        send_task_notify(self._task('5', 'a@example.com, b@example.com'), False, '磁盘不足')

        mail_cls.assert_called_once()
        receivers, subject, body = mail_cls.return_value.send_text_mail.call_args.args
        self.assertEqual(receivers, ['a@example.com', 'b@example.com'])
        self.assertIn('磁盘检查', subject)
        self.assertIn('磁盘不足', body)

    @patch('apps.schedule.utils.Notify')
    @patch('apps.schedule.utils.Mail')
    @patch('apps.schedule.utils.AppSetting.get_default', return_value={})
    def test_email_mode_without_mail_service_does_not_send(self, _setting, mail_cls, notify):
        send_task_notify(self._task('5', 'a@example.com'), False, '磁盘不足')

        mail_cls.assert_not_called()
        notify.make_monitor_notify.assert_called_once()


class ScheduleAnalysisTests(SimpleTestCase):
    def test_build_analysis_messages_contains_task_and_all_host_results(self):
        task = SimpleNamespace(name='磁盘检查', type='巡检', command='df -h')
        outputs = {
            'local': [0, 0.2, '/dev/vda1 92%'],
            '3': [1, 1.1, 'ssh timeout'],
        }

        messages = build_analysis_messages(task, outputs)

        self.assertEqual(messages[0]['role'], 'system')
        self.assertIn('磁盘检查', messages[1]['content'])
        self.assertIn('/dev/vda1 92%', messages[1]['content'])
        self.assertIn('ssh timeout', messages[1]['content'])

    def test_build_analysis_messages_redacts_common_credentials(self):
        task = SimpleNamespace(
            name='部署检查', type='发布',
            command='export DB_PASSWORD=secret123 API_TOKEN=token456')
        outputs = {'1': [1, 0.2, 'Authorization: Bearer abcdef123456']}

        messages = build_analysis_messages(task, outputs)
        content = messages[1]['content']

        self.assertNotIn('secret123', content)
        self.assertNotIn('token456', content)
        self.assertNotIn('abcdef123456', content)
        self.assertIn('[REDACTED]', content)

    def test_build_analysis_messages_limits_total_output_size(self):
        task = SimpleNamespace(name='批量巡检', type='巡检', command='check')
        outputs = {
            '1': [0, 0.2, 'a' * 60000],
            '2': [0, 0.2, 'b' * 60000],
            '3': [0, 0.2, 'c' * 60000],
        }

        messages = build_analysis_messages(task, outputs)

        self.assertLess(len(messages[1]['content']), 70000)

    @patch('apps.schedule.analysis.chat', return_value=('磁盘使用率过高，需要清理。', 'primary'))
    def test_analyze_history_returns_summary_and_model(self, _chat):
        task = SimpleNamespace(name='磁盘检查', type='巡检', command='df -h')

        result = analyze_history(task, {'local': [0, 0.2, '/dev/vda1 92%']})

        self.assertEqual(result, {
            'status': 'success',
            'summary': '磁盘使用率过高，需要清理。',
            'model': 'primary',
        })

    @patch('apps.schedule.analysis.chat', side_effect=RuntimeError('model unavailable'))
    def test_analyze_history_keeps_an_explicit_error_result(self, _chat):
        task = SimpleNamespace(name='磁盘检查', type='巡检', command='df -h')

        result = analyze_history(task, {'local': [0, 0.2, 'ok']})

        self.assertEqual(result['status'], 'error')
        self.assertIn('model unavailable', result['summary'])
