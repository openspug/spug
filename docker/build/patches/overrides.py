import os

# Environment
MYSQL_CONFIG = {
  "HOST": os.getenv('DB_HOST', '127.0.0.1'),
  "PORT": os.getenv('DB_PORT', '3306'),
  "USER": os.getenv('DB_USER', 'spug'),
  "PASSWORD": os.getenv('DB_PASSWORD', 'spug.dev'),
  "DATABASE": os.getenv('DB_DATABASE', 'spug'),
}

REDIS_CONFIG = {
  "HOST": os.getenv('REDIS_HOST', '127.0.0.1'),
  "PORT": os.getenv('REDIS_PORT', '6379'),
  "PASSWORD": os.getenv('REDIS_PASSWORD', ''),
  "DB0": os.getenv('REDIS_DATABASE_0', '0'),
  "DB1": os.getenv('REDIS_DATABASE_1', '1'),
}

# Configuration
DEBUG = False

ALLOWED_HOSTS = ['127.0.0.1']

SECRET_KEY = os.getenv('SECRET_KEY', 'SHOULD_BE_OVERRODE')

DATABASES = {
    'default': {
        'ATOMIC_REQUESTS': True,
        'ENGINE': 'django.db.backends.mysql',
        'NAME': MYSQL_CONFIG['DATABASE'],
        'USER': MYSQL_CONFIG['USER'],
        'PASSWORD': MYSQL_CONFIG['PASSWORD'],
        'HOST': MYSQL_CONFIG['HOST'],
        'PORT': MYSQL_CONFIG['PORT'],
        'OPTIONS': {
            # 'unix_socket': '/var/lib/mysql/mysql.sock',
            'charset': 'utf8mb4',
            'sql_mode': 'STRICT_TRANS_TABLES',
        }
    }
}

CACHES = {
    "default": {
        "BACKEND": "django_redis.cache.RedisCache",
        "LOCATION": "redis://" + REDIS_CONFIG['HOST'] + ":" + REDIS_CONFIG['PORT'] + "/" + REDIS_CONFIG['DB1'],
        "OPTIONS": {
            "CLIENT_CLASS": "django_redis.client.DefaultClient",
            "PASSWORD": REDIS_CONFIG['PASSWORD'],
        }
    }
}

CHANNEL_LAYERS = {
    "default": {
        "BACKEND": "channels_redis.core.RedisChannelLayer",
        "CONFIG": {
            "hosts": [("redis://:" + REDIS_CONFIG['PASSWORD'] + "@" + REDIS_CONFIG['HOST'] + ":" + REDIS_CONFIG['PORT'] + "/" + REDIS_CONFIG['DB0'])],
            "capacity": 1000,
            "expiry": 120,
        },
    },
}
