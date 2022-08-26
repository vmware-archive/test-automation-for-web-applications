# Copyright 2022 VMware, Inc.
# SPDX-License-Identifier: Apache License 2.0

from .base import *

ALLOWED_HOSTS = ['*']

MYSQL_HOST = 'staging.tawa.vmware.com'
MYSQL_PORT = '3306'
MYSQL_USER = 'vmware'
MYSQL_PASS = 'vmware'
MYSQL_DB = 'tawa'

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.mysql',
        'NAME': MYSQL_DB,
        'USER': MYSQL_USER,
        'PASSWORD': MYSQL_PASS,
        'HOST': MYSQL_HOST,
        'PORT': MYSQL_PORT,
        'CHARSET': 'utf8'
    }
}

CONSOLE_POOLS = {
    "public": {
        'type': 'remote',
        'upload_console_files': 'true',
        'hosts': {
            "staging.tawa.vmware.com": {'user': 'root', 'pass': 'tawa', 'port': 22}
        }
    }
}

WORKER_IMAGE = 'harbor-repo.vmware.com/vtaas_workers/parallel:tawa'
LOCALHOST_IP = 'vuserver.ara.decc.vmware.com'
PARALLEL_SERVER = LOCALHOST_IP + ':9100'
VNC_MAPPING = {}

USE_TZ = False
WEBSOCKET_SERVER = 'ws://' + LOCALHOST_IP + ':9100'
SCRIPT_TEMPLATES = {
    'nodejs/vtaas-v2default': {
        "packages": {
            'common': os.path.join(BASE_DIR, 'script/nodejs/vtaas-v2default',
                                   'common'),
        },
        "actions_mappings": {
        }
    }
}

STORAGE_ROOT = '/var/tawa_files/'
os.makedirs(STORAGE_ROOT, exist_ok=True)
SCRIPTS_ROOT = os.path.join(STORAGE_ROOT, 'scripts')
os.makedirs(SCRIPTS_ROOT, exist_ok=True)
CONSOLES_ROOT = os.path.join(STORAGE_ROOT, 'consoles')
os.makedirs(CONSOLES_ROOT, exist_ok=True)
DOWNLOADS_ROOT = os.path.join(STORAGE_ROOT, 'downloads')
os.makedirs(DOWNLOADS_ROOT, exist_ok=True)
VIDEOS_ROOT = os.path.join(STORAGE_ROOT, 'videos')
os.makedirs(VIDEOS_ROOT, exist_ok=True)
# HTTP_PROXY = "http://proxy.vmware.com:3128"
# HTTPS_PROXY = "https://proxy.vmware.com:3128"
