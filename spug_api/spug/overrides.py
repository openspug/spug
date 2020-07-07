
DEBUG = True
ALLOWED_HOSTS = ['127.0.0.1']

DATABASES = {
    'default': {
        'ATOMIC_REQUESTS': True,
        'ENGINE': 'django.db.backends.mysql',
        'NAME': 'spug_release',             # 替换为自己的数据库名，请预先创建好编码为utf8mb4的数据库
        'USER': 'root',        # 数据库用户名
        'PASSWORD': 'Redhat#1bm',  # 数据库密码
        'HOST': '127.0.0.1',        # 数据库地址
        'OPTIONS': {
            'charset': 'utf8mb4',
            'sql_mode': 'STRICT_TRANS_TABLES',
            #'unix_socket': '/opt/mysql/mysql.sock' # 如果是本机数据库,且不是默认安装的Mysql,需要指定Mysql的socket文件路径
        }
    }
}