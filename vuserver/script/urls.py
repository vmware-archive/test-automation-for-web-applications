# Copyright 2022 VMware, Inc.
# SPDX-License-Identifier: Apache License 2.0

from django.conf.urls import url
from .views import Templates, ScriptDetail, GenerateScript, Download

app_name = 'script'

script_patterns = [
    # generate
    url(r'^templates$', Templates.as_view(), name='api_templates'),
    url(r'^generate$', GenerateScript.as_view(), name='api_generate_script'),
    url(r'^scripts/(?P<id>[\w\-]+)$', ScriptDetail.as_view(), name='api_script_detail'),
    url(r'^download/(?P<id>[\w\-]+)$', Download.as_view(), name='api_download'),
    # configuration
    # url(r'^scriptsbyids/$', ScriptsByIds.as_view(), name='api_scripts_by_ids'),
    # url(r'^scriptevents/$', ScriptEvents.as_view(), name='api_script_events'),
    # url(r'^scriptsteps/$', ScriptSteps.as_view(), name='api_script_steps')
]
