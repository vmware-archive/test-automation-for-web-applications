# Copyright 2022 VMware, Inc.
# SPDX-License-Identifier: Apache License 2.0


import os

from django.core.wsgi import get_wsgi_application

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "vuserver.settings")

application = get_wsgi_application()
