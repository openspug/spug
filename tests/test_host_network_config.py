#!/usr/bin/env python3
import ast
import json
import os
from pathlib import Path
import subprocess

ROOT = Path(__file__).resolve().parents[1]
COMPOSE = Path(os.environ.get("COMPOSE_FILE", ROOT / "docker-compose.yml"))
NGINX = Path(os.environ.get("NGINX_FILE", ROOT / "docs/docker/nginx-host.conf"))
REDIS = Path(os.environ.get("REDIS_FILE", ROOT / "docs/docker/redis-host.conf"))
SETTINGS = Path(os.environ.get("SETTINGS_FILE", ROOT / "spug_api/spug/settings.py"))


def active_directives(path: Path, directive: str) -> list[str]:
    lines = []
    for raw_line in path.read_text().splitlines():
        line = raw_line.strip()
        if line and not line.startswith("#") and line.split(maxsplit=1)[0] == directive:
            lines.append(line)
    return lines


def compose_service() -> dict:
    env = os.environ.copy()
    env.update({
        "SPUG_SECRET_KEY": "test",
        "SPUG_DB_ENGINE": "django.db.backends.postgresql",
        "SPUG_DB_NAME": "spug",
        "SPUG_DB_USER": "spug",
        "SPUG_DB_PASSWORD": "test",
        "SPUG_DB_HOST": "127.0.0.1",
        "SPUG_DB_PORT": "5432",
    })
    result = subprocess.run(
        ["docker", "compose", "-f", str(COMPOSE), "config", "--format", "json"],
        check=True,
        capture_output=True,
        text=True,
        env=env,
    )
    return json.loads(result.stdout)["services"]["spug"]


def assignment(tree: ast.AST, name: str) -> ast.AST:
    values = []
    for node in ast.walk(tree):
        if isinstance(node, ast.Assign) and any(
            isinstance(target, ast.Name) and target.id == name for target in node.targets
        ):
            values.append(node.value)
    if len(values) != 1:
        raise AssertionError(f"expected exactly one assignment for {name}, found {len(values)}")
    return values[0]


def keyed_values(tree: ast.AST, key: str) -> list[ast.AST]:
    values = []
    for node in ast.walk(tree):
        if not isinstance(node, ast.Dict):
            continue
        for item_key, item_value in zip(node.keys, node.values):
            if isinstance(item_key, ast.Constant) and item_key.value == key:
                values.append(item_value)
    return values


def same_expression(actual: ast.AST, expression: str) -> bool:
    expected = ast.parse(expression, mode="eval").body
    return ast.dump(actual, include_attributes=False) == ast.dump(expected, include_attributes=False)


def main() -> None:
    service = compose_service()
    assert service.get("network_mode") == "host"
    assert not service.get("ports")
    assert service["environment"]["SPUG_REDIS_PORT"] == "16379"
    assert "host.docker.internal=host-gateway" in service.get("extra_hosts", [])

    mounted_sources = {
        Path(volume["source"]).name: volume["target"] for volume in service["volumes"]
    }
    assert mounted_sources.get("nginx-host.conf") == "/etc/nginx/nginx.conf"
    assert "nginx.conf" not in mounted_sources
    assert mounted_sources.get("redis-host.conf") == "/etc/redis.conf"

    assert active_directives(NGINX, "listen") == [
        "listen       127.0.0.1:8089 default_server;"
    ]
    assert active_directives(NGINX, "include") == [
        "include /etc/nginx/modules-enabled/*.conf;",
        "include             /etc/nginx/mime.types;",
    ]
    assert active_directives(REDIS, "include") == []
    assert active_directives(REDIS, "bind") == ["bind 127.0.0.1"]
    assert active_directives(REDIS, "port") == ["port 16379"]
    assert active_directives(REDIS, "pidfile") == ["pidfile /var/run/redis_16379.pid"]

    settings_tree = ast.parse(SETTINGS.read_text())
    assert same_expression(
        assignment(settings_tree, "_REDIS_HOST"),
        "os.environ.get('SPUG_REDIS_HOST', '127.0.0.1')",
    )
    assert same_expression(
        assignment(settings_tree, "_REDIS_PORT"),
        "int(os.environ.get('SPUG_REDIS_PORT', '6379'))",
    )

    locations = keyed_values(assignment(settings_tree, "CACHES"), "LOCATION")
    assert len(locations) == 1 and same_expression(
        locations[0], "f'redis://{_REDIS_HOST}:{_REDIS_PORT}/1'"
    )
    hosts = keyed_values(assignment(settings_tree, "CHANNEL_LAYERS"), "hosts")
    assert len(hosts) == 1 and same_expression(hosts[0], "[(_REDIS_HOST, _REDIS_PORT)]")


if __name__ == "__main__":
    main()
