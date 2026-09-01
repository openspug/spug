DEBUG = False
ALLOWED_HOSTS = ['127.0.0.1', 'localhost']
SECRET_KEY = 'local-spug4-5qw!4rdwmj3u8@gs2v9^c6xph7n#kaf0'

DATABASES = {
    'default': {
        'ATOMIC_REQUESTS': True,
        'ENGINE': 'django.db.backends.mysql',
        'NAME': 'spug',
        'USER': 'spug',
        'PASSWORD': 'spug.cc',
        'HOST': 'db',
        'PORT': 3306,
        'OPTIONS': {
            'charset': 'utf8mb4',
            'sql_mode': 'STRICT_TRANS_TABLES',
        },
    }
}
