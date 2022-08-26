# Copyright 2022 VMware, Inc.
# SPDX-License-Identifier: Apache License 2.0

# encoding: utf-8
from __future__ import unicode_literals

from django.conf.urls import url
from .views import Pools, DeployStart, DeployStop

app_name = 'pool'

pool_patterns = [
    url(r'^pools$', Pools.as_view(), name='v1_api_pools'),
    url(r'^start$', DeployStart.as_view(), name='v1_api_deploy_start'),
    url(r'^stop$', DeployStop.as_view(), name='v1_api_deploy_stop')
]
