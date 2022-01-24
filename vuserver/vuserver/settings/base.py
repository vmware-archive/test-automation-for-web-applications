# Copyright 2022 VMware, Inc.
# SPDX-License-Identifier: Apache License 2.0


import os
import sys

# Build paths inside the project like this: os.path.join(BASE_DIR, ...)
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BASE_DIR = os.path.dirname(BASE_DIR)

# Quick-start development settings - unsuitable for production
# See https://docs.djangoproject.com/en/1.11/howto/deployment/checklist/

# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = 'rp6%@_u*)l#*tqz2k++b1pmb6_&xq-u*h(g*&o8)dw$n%4bv1%'

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = True
APPEND_SLASH=True
# 20M
DATA_UPLOAD_MAX_MEMORY_SIZE = 20971520

ALLOWED_HOSTS = ['*']

# Database
# https://docs.djangoproject.com/en/1.11/ref/settings/#databases

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': os.path.join(BASE_DIR, 'db.sqlite3'),
    }
}

# Allow CORS before INSTALLED_APPS
CORS_ORIGIN_ALLOW_ALL = True
CORS_ALLOW_CREDENTIALS = False

# Application definition
INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'channels',
    'parallel',
    'script',
    'container_pool',
    'rest_framework_tracking',
    'corsheaders',
    'rest_framework',
    'drf_yasg'
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'vuserver.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [os.path.join(BASE_DIR,'templates')],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'vuserver.wsgi.application'

# Password validation
# https://docs.djangoproject.com/en/1.11/ref/settings/#auth-password-validators

AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]

REST_FRAMEWORK = {
    'DEFAULT_VERSIONING_CLASS': 'rest_framework.versioning.URLPathVersioning'
}

# Internationalization
# https://docs.djangoproject.com/en/1.11/topics/i18n/

LANGUAGE_CODE = 'en-us'

TIME_ZONE = 'UTC'

USE_I18N = True

USE_L10N = True

USE_TZ = True


# Static files (CSS, JavaScript, Images)
# https://docs.djangoproject.com/en/1.11/howto/static-files/

STATIC_URL = '/static/'
STATIC_ROOT = os.path.join(BASE_DIR, 'collected_static')
STATICFILES_DIRS = [
    os.path.join(BASE_DIR, "static"),
]
STATICFILES_FINDERS = (
    "django.contrib.staticfiles.finders.FileSystemFinder",
    "django.contrib.staticfiles.finders.AppDirectoriesFinder"
)

MEDIA_URL = '/media/'
MEDIA_ROOT = os.path.join(BASE_DIR, 'media')

redis_host = os.environ.get('REDIS_HOST', '127.0.0.1')


ASGI_APPLICATION = "vuserver.routing.application"
# Channel layer definitions
# http://channels.readthedocs.org/en/latest/deploying.html#setting-up-a-channel-backend
CHANNEL_LAYERS = {
    "default": {
        # This example app uses the Redis channel layer implementation asgi_redis
        "BACKEND": "channels_redis.core.RedisChannelLayer",
        "CONFIG": {
            "hosts": [(redis_host, 6379)],
        },
    },
}

# Password validation
# https://docs.djangoproject.com/en/dev/ref/settings/#auth-password-validators
# Deliberately turned off for this example.
AUTH_PASSWORD_VALIDATORS = []

LOGIN_REDIRECT_URL = "/"
LOGOUT_REDIRECT_URL = "/"

# %T @ https://wiki.eng.vmware.com/Build/L10NSupport
LOCALE_MAP = {
    'cs':    'cs_CZ',
    'cs-CZ': 'cs_CZ', # *
    'da':    'da_DK',
    'da-DK': 'da_DK', # *
    'de':    'de_DE',
    'de-DE': 'de_DE', # *
    'en':    'en_US',
    'en-US': 'en_US', # *
    'en-GB': 'en_GB', # *
    'es':    'es_ES',
    'es-ES': 'es_ES', # *
    'fr':    'fr_FR',
    'fr-FR': 'fr_FR', # *
    'it':    'it_IT',
    'it-IT': 'it_IT', # *
    'ja':    'ja_JP', # *
    'ja-JP': 'ja_JP',
    'ko':    'ko_KR',
    'ko-KR': 'ko_KR', # *
    'nl':    'nl_NL',
    'nl-NL': 'nl_NL', # *
    'pl':    'pl_PL',
    'pl-PL': 'pl_PL', # *
    'pt':    'pt_PT',
    'pt-PT': 'pt_PT', # *
    'pt-BR': 'pt_BR', # *
    'ru':    'ru_RU',
    'ru-RU': 'ru_RU', # *
    'sv':    'sv_SE',
    'sv-SE': 'sv_SE', # *
    'tr':    'tr_TR',
    'tr-TR': 'tr_TR', # *
    'zh-CN': 'zh_CN', # *
    'zh-TW': 'zh_TW'  # *
}

LOCALE_FORM = (
        ['cs_CZ', ''],
        ['da_DK', ''],
        ['de_DE', ''],
        ['en_US', ''],
        ['en_GB', ''],
        ['es_ES', ''],
        ['fr_FR', ''],
        ['it_IT', ''],
        ['ja_JP', ''],
        ['ko_KR', ''],
        ['nl_NL', ''],
        ['pl_PL', ''],
        ['pt_PT', ''],
        ['pt_BR', ''],
        ['ru_RU', ''],
        ['sv_SE', ''],
        ['tr_TR', ''],
        ['zh_CN', ''],
        ['zh_TW', ''],
    )

BROWSER_FORM = (
    ['Chrome',  ''],
    ['Firefox', '']
)

FEATURE_FORM = (
    ['deploy',  ''],
    ['parallel', ''],
    ['replay', '']
)

RESOLUTIONS = ('1440x900',
               '1600x1200',
               '1920x1080',
               '1920x1200')

VNC_MAPPING = {}
VNC_WEBPROTOCOL = 'http'

TEMPLATE_LANGUAGES = ['nodejs', ]
DEFAULT_TEMPLATE = 'nodejs/vtaas-v2default'
TEMPLATE_ROOT = os.path.join(BASE_DIR, 'script')
SCRIPT_TEMPLATES = {}
BASE_LOG_DIR = os.path.join(BASE_DIR, "log")
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {
            'format': '[%(asctime)s][%(threadName)s:%(thread)d][task_id:%(name)s][%(filename)s:%(lineno)d]'
                      '[%(levelname)s][%(message)s]'
        },
        'standard': {
            'format': '[{asctime}][{levelname:7}]{name}:{filename}:{lineno}:{message}',
            'style': '{',
        },
        'console': {
            'format': '[{asctime}][{levelname:7}]{name}:{message}',
            'style': '{',
        },
    },
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
            'formatter': 'standard',
        },
        'file': {
            'class': 'logging.handlers.RotatingFileHandler',
            'formatter': 'standard',
            'filename': os.path.join(BASE_LOG_DIR, "vuserver.log"),
            'maxBytes': 4194304,  # 4 MB
            'backupCount': 10,
            'level': 'DEBUG',
        },
    },
    'loggers': {
        '': {
            'handlers': ['console', 'file'],
            'level': os.getenv('DJANGO_LOG_LEVEL', 'DEBUG'),
        },
        'parallel': {
            'handlers': ['console', 'file'],
            'level': os.getenv('DJANGO_LOG_LEVEL', 'DEBUG'),
            'propagate': False,
        },
        'script': {
            'handlers': ['console', 'file'],
            'level': os.getenv('DJANGO_LOG_LEVEL', 'DEBUG'),
            'propagate': False,
        },
        'pool': {
            'handlers': ['console', 'file'],
            'level': os.getenv('DJANGO_LOG_LEVEL', 'DEBUG'),
            'propagate': False,
        },
        'django': {
            'handlers': ['console', 'file'],
            'level': os.getenv('DJANGO_LOG_LEVEL', 'INFO'),
            'propagate': False,
        },
    },
}