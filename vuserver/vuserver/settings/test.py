# Copyright 2022 VMware, Inc.
# SPDX-License-Identifier: Apache License 2.0
import socket

from .base import *

ALLOWED_HOSTS = ['*']
CORS_ALLOW_CREDENTIALS = True
CORS_ORIGIN_ALLOW_ALL = True
HTTP_SCREENSHOT_SERVER = "http://127.0.0.1:5000"

CONSOLE_POOLS = {
    "public": {
        'type': 'remote',
        'upload_console_files': 'true',
        'hosts': {
            "staging.tawa.vmware.com": {'user':'root', 'pass':'tawa', 'port':22}
        }
    }
}
DEFAULT_POOL = 'public'
WORKER_IMAGE = 'harbor-repo.vmware.com/vtaas_workers/parallel:tawa'

LOCALHOST_IP = '192.168.0.6'
PARALLEL_SERVER = LOCALHOST_IP + ':9100'
VNC_MAPPING = {}

USE_TZ = False
WEBSOCKET_SERVER = 'ws://' + LOCALHOST_IP + ':9100'
SCRIPT_TEMPLATES = {
    'nodejs/vtaas-v2default': {
        "packages": {
            'common': os.path.join(BASE_DIR, 'script/nodejs/vtaas-v2default', 'common'),
        },
        "actions_mappings": {
        }
    }
}

HTTP_ACCESSIBILITY_SERVER = 'http://vms.eng.vmware.com:9004'
EXT_ACCESSIBILITY_ENABLE = 'true'

STORAGE_ROOT = os.path.join(BASE_DIR, "log")
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
