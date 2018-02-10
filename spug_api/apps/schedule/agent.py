import subprocess
from datetime import datetime
from threading import Thread
from functools import partial
from apps.assets.models import Host
from apps.configuration.models import Environment
from apps.deploy.models import App
from apps.schedule.models import JobHistory
from libs.utils import Container
from libs.ssh import ssh_exec_command


# targets有三种格式：
#   localhost   服务端本机执行
#   1           整数类型，主机的id，代表在对应主机上执行
#   1_2_3       用下划线连接的整数，主机id_应用id_环境id，同个三个id组合出某个主机上的某个容器内执行
def agent(job_id, user, command, targets):
    threads, host_ids, app_ids, env_ids, info = [], set(), set(), set(), {'hosts': {}, 'apps': {}, 'environments': {}}
    write_history_callback = partial(JobHistory.write, job_id, datetime.now())
    for target in targets.split(','):
        if target == 'local':
            threads.append(Thread(target=local_executor, args=(command, write_history_callback)))
        elif target.isdigit():
            threads.append(Thread(target=host_executor, args=(info, command, target, write_history_callback)))
            host_ids.add(target)
        else:
            threads.append(Thread(target=container_executor, args=(info, user, command, target, write_history_callback)))
            cli_id, pro_id, env_id = target.split('_')
            host_ids.add(cli_id)
            app_ids.add(pro_id)
            env_ids.add(env_id)
    if app_ids:
        for app in App.query.filter(App.id.in_(app_ids)).all():
            info['apps'][str(app.id)] = app
    if host_ids:
        for cli in Host.query.filter(Host.id.in_(host_ids)).all():
            info['hosts'][str(cli.id)] = cli
    if env_ids:
        for env in Environment.query.filter(Environment.id.in_(env_ids)).all():
            info['environments'][str(env.id)] = env
    for t in threads:
        t.start()
    for t in threads:
        t.join()


def local_executor(command, callback):
    task = subprocess.Popen(command, shell=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    exit_code = task.wait()
    callback('local', exit_code, task.stdout.read(), task.stderr.read())


def host_executor(info, command, target, callback):
    cli = info['hosts'][target]
    exit_code, stdout, stderr = ssh_exec_command(cli.ssh_ip, cli.ssh_port, command)
    callback(target, exit_code, stdout, stderr)


def container_executor(info, user, command, target, callback):
    cli_id, pro_id, env_id = target.split('_')
    cli = info['hosts'][cli_id]
    ctr_name = '%s.%s' % (info['apps'][pro_id].identify, info['environments'][env_id].identify)
    ctr = Container(cli.docker_uri, ctr_name)
    exit_code, output = ctr.exec_command('sh -c %r' % command, with_exit_code=True, user=user)
    callback(target, exit_code, output, '')
