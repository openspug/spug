# coding=utf-8
from functools import wraps
from getpass import getpass
import sys
import os

commands = {}
commands_desc = {}


# 工具函数
def check_input_password(password):
    if len(password.strip()) < 6:
        return check_input_password(getpass('密码长度必须大于6位，请重新输入管理员账户密码：'))
    password2 = getpass('再次输入：')
    if password == password2.strip():
        return password
    else:
        return check_input_password(getpass('两次输入密码不一致，请重新输入管理员账户密码：'))


def check_input_username(username):
    if username.strip():
        return username
    else:
        return check_input_username(input('请输入管理员账户登录名：'))


# 注册命令
def registry_command(cmd_str, cmd_desc=''):
    def decorate(func):
        commands[cmd_str] = func
        commands_desc[cmd_str] = cmd_desc

        @wraps(func)
        def wrapper(*args, **kwargs):
            return func(*args, **kwargs)
        return wrapper
    return decorate


@registry_command('init_db', '初始化数据库')
def init_db():
    from public import db
    from config import BASE_DIR
    import apps.account.models
    import apps.configuration.models
    import apps.deploy.models
    import apps.assets.models
    import apps.schedule.models
    import apps.setting.models

    user_input = input('是否要初始化数据库，该操作会清空所有数据[y|n]？')
    if user_input.strip() == 'y':
        db.drop_all()
        db.create_all()
        with open(os.path.join(BASE_DIR, 'libs', 'sql', 'permissions.sql'), 'r') as f:
            line = f.readline()
            while line:
                if line.startswith('INSERT INTO'):
                    db.engine.execute(line.strip())
                line = f.readline()
        print('数据库已初始化成功！')
        user_input = input('是否需要创建管理员账户[y|n]？')
        if user_input.strip() == 'y':
            create_admin()


@registry_command('create_admin', '创建管理员账户')
def create_admin():
    from apps.account.models import User

    admin = User.query.filter_by(is_supper=True).first()
    if admin:
        user_input = input('已存在管理员账户 <%s>，需要重置密码[y|n]？' % admin.username)
        if user_input.strip() == 'y':
            password = check_input_password(getpass('请输入新的管理员账户密码：'))
            admin.password = password
            admin.token_expired = 0
            admin.save()
            print('重置管理员密码成功！')
    else:
        username = check_input_username(input('请输入管理员账户登录名：'))
        password = check_input_password(getpass('请输入管理员账户密码：'))
        User(username=username, password=password, nickname='管理员', is_supper=True).save()
        print('创建管理员账户成功！')


@registry_command('enable_admin', '启用管理员账户，用于登录失败次数过多账户被禁用时使用')
def enable_admin():
    from apps.account.models import User

    admin = User.query.filter_by(is_supper=True).first()
    admin.update(is_active=True)
    print('管理员账户状态已修改为启用！')


def print_usage():
    cmd_desc_str = '''
usage: %s <command>

command:
    '''
    for k in commands_desc.keys():
        cmd_desc_str += '\t{0}\n\t\t-- {1}\n'.format(str(k), str(commands_desc.get(k) if commands_desc.get(k) else ''))
    print(cmd_desc_str % sys.argv[0])


if __name__ == '__main__':
    if len(sys.argv) == 1:
        print_usage()
        sys.exit(1)
    cmd = sys.argv.pop(0)
    arg1 = sys.argv.pop(0)
    r_func = commands.get(arg1)
    if callable(r_func):
        r_func(*sys.argv)
    else:
        print('遇到了不可能会出现的错误！')
