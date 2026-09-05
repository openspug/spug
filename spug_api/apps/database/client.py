import json
import shlex
import time
from contextlib import closing
from datetime import date, datetime
from decimal import Decimal


ROW_LIMIT = 1000
CONNECT_TIMEOUT = 10
QUERY_TIMEOUT = 30


class DatabaseClientError(Exception):
    pass


def _json_value(value):
    if value is None or isinstance(value, (str, int, float, bool)):
        return value
    if isinstance(value, datetime):
        return value.isoformat(sep=' ')
    if isinstance(value, date):
        return value.isoformat()
    if isinstance(value, Decimal):
        return float(value)
    if isinstance(value, bytes):
        return value.decode('utf-8', errors='replace')
    return str(value)


def _result(columns, rows, elapsed, affected=0, truncated=False, message=''):
    return {
        'columns': list(columns),
        'rows': [[_json_value(value) for value in row] for row in rows],
        'affected': max(affected or 0, 0),
        'elapsed': round(elapsed * 1000),
        'truncated': truncated,
        'message': message,
    }


def _mysql(connection):
    import pymysql

    ssl = {} if connection.use_ssl else None
    return pymysql.connect(
        host=connection.host, port=connection.port,
        user=connection.username or None, password=connection.get_password(),
        database=connection.database or None, charset='utf8mb4', autocommit=True,
        connect_timeout=CONNECT_TIMEOUT, read_timeout=QUERY_TIMEOUT,
        write_timeout=QUERY_TIMEOUT, ssl=ssl,
    )


def _postgresql(connection):
    import psycopg

    return psycopg.connect(
        host=connection.host, port=connection.port,
        user=connection.username or None, password=connection.get_password() or None,
        dbname=connection.database or 'postgres', connect_timeout=CONNECT_TIMEOUT,
        sslmode='require' if connection.use_ssl else 'prefer',
        options=f'-c statement_timeout={QUERY_TIMEOUT * 1000}', autocommit=True,
    )


def _clickhouse(connection):
    import clickhouse_connect

    return clickhouse_connect.get_client(
        host=connection.host, port=connection.port,
        username=connection.username or 'default', password=connection.get_password(),
        database=connection.database or 'default', secure=connection.use_ssl,
        connect_timeout=CONNECT_TIMEOUT, send_receive_timeout=QUERY_TIMEOUT,
    )


def _redis(connection):
    import redis

    try:
        db = int(connection.database or 0)
    except ValueError as exc:
        raise DatabaseClientError('Redis 数据库编号必须是整数') from exc
    return redis.Redis(
        host=connection.host, port=connection.port, db=db,
        username=connection.username or None, password=connection.get_password() or None,
        ssl=connection.use_ssl, socket_connect_timeout=CONNECT_TIMEOUT,
        socket_timeout=QUERY_TIMEOUT, decode_responses=True,
    )


def test_connection(connection):
    started = time.monotonic()
    try:
        if connection.type in ('mysql', 'mariadb'):
            with closing(_mysql(connection)) as client:
                with client.cursor() as cursor:
                    cursor.execute('SELECT 1')
        elif connection.type == 'postgresql':
            with closing(_postgresql(connection)) as client:
                with client.cursor() as cursor:
                    cursor.execute('SELECT 1')
        elif connection.type == 'clickhouse':
            with closing(_clickhouse(connection)) as client:
                client.query('SELECT 1')
        elif connection.type == 'redis':
            with closing(_redis(connection)) as client:
                client.ping()
        else:
            raise DatabaseClientError('不支持的数据库类型')
    except DatabaseClientError:
        raise
    except Exception as exc:
        raise DatabaseClientError(str(exc)) from exc
    return round((time.monotonic() - started) * 1000)


def _dbapi_execute(client, command):
    started = time.monotonic()
    with client.cursor() as cursor:
        cursor.execute(command)
        if cursor.description:
            columns = [item[0] for item in cursor.description]
            rows = cursor.fetchmany(ROW_LIMIT + 1)
            truncated = len(rows) > ROW_LIMIT
            return _result(columns, rows[:ROW_LIMIT], time.monotonic() - started,
                           truncated=truncated)
        return _result([], [], time.monotonic() - started,
                       affected=cursor.rowcount, message='执行成功')


def _clickhouse_execute(client, command):
    started = time.monotonic()
    keyword = command.lstrip().split(None, 1)[0].upper()
    if keyword in ('SELECT', 'SHOW', 'DESCRIBE', 'DESC', 'EXPLAIN', 'WITH'):
        result = client.query(command)
        rows = result.result_rows
        truncated = len(rows) > ROW_LIMIT
        return _result(result.column_names, rows[:ROW_LIMIT], time.monotonic() - started,
                       truncated=truncated)
    value = client.command(command)
    message = '执行成功' if value in (None, '') else str(value)
    return _result([], [], time.monotonic() - started, message=message)


def _redis_execute(client, command):
    try:
        args = shlex.split(command)
    except ValueError as exc:
        raise DatabaseClientError(f'命令解析失败: {exc}') from exc
    if not args:
        raise DatabaseClientError('请输入 Redis 命令')
    started = time.monotonic()
    value = client.execute_command(*args)
    elapsed = time.monotonic() - started
    if isinstance(value, list):
        rows = [[item] for item in value[:ROW_LIMIT]]
        return _result(['value'], rows, elapsed, truncated=len(value) > ROW_LIMIT)
    if isinstance(value, dict):
        rows = [[key, item] for key, item in list(value.items())[:ROW_LIMIT]]
        return _result(['key', 'value'], rows, elapsed, truncated=len(value) > ROW_LIMIT)
    if isinstance(value, (str, int, float)) or value is None:
        return _result(['value'], [[value]], elapsed)
    return _result(['value'], [[json.dumps(value, ensure_ascii=False, default=str)]], elapsed)


def execute(connection, command):
    command = command.strip()
    if not command:
        raise DatabaseClientError('请输入要执行的命令')
    try:
        if connection.type in ('mysql', 'mariadb'):
            with closing(_mysql(connection)) as client:
                return _dbapi_execute(client, command)
        if connection.type == 'postgresql':
            with closing(_postgresql(connection)) as client:
                return _dbapi_execute(client, command)
        if connection.type == 'clickhouse':
            with closing(_clickhouse(connection)) as client:
                return _clickhouse_execute(client, command)
        if connection.type == 'redis':
            with closing(_redis(connection)) as client:
                return _redis_execute(client, command)
        raise DatabaseClientError('不支持的数据库类型')
    except DatabaseClientError:
        raise
    except Exception as exc:
        raise DatabaseClientError(str(exc)) from exc


def metadata(connection):
    try:
        if connection.type in ('mysql', 'mariadb'):
            with closing(_mysql(connection)) as client:
                with client.cursor() as cursor:
                    cursor.execute("""
                        SELECT table_schema, table_name
                        FROM information_schema.tables
                        WHERE table_schema NOT IN ('information_schema', 'mysql', 'performance_schema', 'sys')
                        ORDER BY table_schema, table_name
                    """)
                    rows = cursor.fetchmany(5001)
        elif connection.type == 'postgresql':
            with closing(_postgresql(connection)) as client:
                with client.cursor() as cursor:
                    cursor.execute("""
                        SELECT table_schema, table_name
                        FROM information_schema.tables
                        WHERE table_schema NOT IN ('pg_catalog', 'information_schema')
                        ORDER BY table_schema, table_name
                    """)
                    rows = cursor.fetchmany(5001)
        elif connection.type == 'clickhouse':
            with closing(_clickhouse(connection)) as client:
                rows = client.query("""
                    SELECT database, name FROM system.tables
                    WHERE database NOT IN ('system', 'information_schema', 'INFORMATION_SCHEMA')
                    ORDER BY database, name LIMIT 5001
                """).result_rows
        elif connection.type == 'redis':
            with closing(_redis(connection)) as client:
                keys = []
                cursor = 0
                while True:
                    cursor, batch = client.scan(cursor=cursor, count=200)
                    keys.extend(batch)
                    if cursor == 0 or len(keys) >= 1000:
                        break
                return {
                    'groups': [{'name': f'DB {connection.database or 0}', 'items': keys[:1000]}],
                    'truncated': len(keys) >= 1000,
                }
        else:
            raise DatabaseClientError('不支持的数据库类型')
    except DatabaseClientError:
        raise
    except Exception as exc:
        raise DatabaseClientError(str(exc)) from exc

    groups = {}
    for namespace, table in rows[:5000]:
        groups.setdefault(namespace, []).append(table)
    return {
        'groups': [{'name': name, 'items': items} for name, items in groups.items()],
        'truncated': len(rows) > 5000,
    }
