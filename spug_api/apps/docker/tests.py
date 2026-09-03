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
    build_resource_command,
    cache_key,
    parse_docker_inspect,
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
        self.assertEqual(cache_key(7), 'spug:docker:projects:7')
        self.assertEqual(cache_key(None), 'spug:docker:projects:local')

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
