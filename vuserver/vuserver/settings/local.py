# Copyright 2022 VMware, Inc.
# SPDX-License-Identifier: Apache License 2.0

import os
from .base import *
# from ssserver.settings import *

ALLOWED_HOSTS = ['*']


POOL_HOSTS = {
    "default": {
        'type': 'localhost'
    }
}

LOCALHOST_IP = '192.168.0.103'
PARALLEL_SERVER = LOCALHOST_IP + ':9000'
VNC_MAPPING = {}
SHAREDPOOL_URL = 'http://' + LOCALHOST_IP + ':9000/pool'

USE_TZ = False
WEBSOCKET_SERVER = 'ws://' + LOCALHOST_IP + ':9000'
SCRIPT_TEMPLATES = {
    'nodejs/vtaas-v2default': {
        "packages": {
            'common': os.path.join(BASE_DIR, 'script/nodejs/vtaas-v2default', 'common'),
        },
        "actions_mappings": {
        }
    }
}

PARALLEL_WORKER_IMAGE = 'localhost:5000/parallel:latest'
STORAGE_ROOT = '/var/tawa_files/'
os.makedirs(STORAGE_ROOT, exist_ok=True)
SCRIPTS_ROOT = os.path.join(STORAGE_ROOT, 'script')
os.makedirs(SCRIPTS_ROOT, exist_ok=True)
PARALLEL_ROOT = os.path.join(STORAGE_ROOT, 'parallel')
os.makedirs(PARALLEL_ROOT, exist_ok=True)
DOWNLOADS_ROOT = os.path.join(STORAGE_ROOT, 'downloads')
os.makedirs(DOWNLOADS_ROOT, exist_ok=True)

# HTTP_PROXY = "http://proxy.vmware.com:3128"
# HTTPS_PROXY = "https://proxy.vmware.com:3128"