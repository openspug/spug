# Copyright: (c) <spug.dev@gmail.com>
# Released under the AGPL-3.0 License.
"""命令风险规则的回归测试。

修复模式允许变更服务器，但服务器上通常还跑着其他项目，
一旦让模型自行执行批量/跨项目的破坏性命令，损失不可恢复。
这里锁定「必须拦截」与「不得误伤」两类样本。
"""
from django.test import SimpleTestCase
from apps.ai.risk import check_command


class CheckCommandTests(SimpleTestCase):
    # 会波及告警对象之外的服务或数据，修复模式必须拦下
    CROSS_SERVICE = [
        'docker system prune -af',
        'docker volume rm app_data',
        'docker rm -f $(docker ps -aq)',
        'docker compose -p new-api -f a.yml down --remove-orphans',
        'docker compose -f a.yml down -v',
        'mysql -e "drop database orders"',
        'mysql -e "truncate table users"',
        'find /data -name "*.log" -delete',
        'ls /data | xargs rm -rf',
        'rm -rf /var/lib/mysql',
        'apt-get purge nginx',
        'killall nginx',
    ]
    # 限定在单个目标上的常规修复操作，不应被误伤
    SCOPED_REPAIR = [
        'systemctl restart nginx',
        'docker restart new-api',
        'docker compose -p new-api -f /opt/new-api/compose.yaml up -d',
        'rm -f /tmp/new-api.lock',
        'journalctl -u nginx -n 100',
        'df -h',
    ]

    def test_repair_blocks_cross_service_commands(self):
        for command in self.CROSS_SERVICE:
            with self.subTest(command=command):
                self.assertIsNotNone(
                    check_command(command, 'repair'),
                    f'跨服务破坏性命令未被拦截: {command}')

    def test_repair_allows_scoped_commands(self):
        for command in self.SCOPED_REPAIR:
            with self.subTest(command=command):
                self.assertIsNone(
                    check_command(command, 'repair'),
                    f'常规修复命令被误伤: {command}')

    def test_chat_mode_also_blocks_cross_service(self):
        # 对话模式有人值守，拦截后转为人工确认，同样不能让模型自行决定
        self.assertIsNotNone(check_command('docker system prune -af', 'agent'))

    def test_diagnose_blocks_write_commands(self):
        self.assertIsNotNone(check_command('systemctl restart nginx', 'diagnose'))
        self.assertIsNone(check_command('systemctl status nginx', 'diagnose'))

    def test_dangerous_commands_blocked_in_all_modes(self):
        for mode in ('repair', 'diagnose', 'agent'):
            with self.subTest(mode=mode):
                self.assertIsNotNone(check_command('reboot', mode))
