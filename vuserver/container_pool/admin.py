# Copyright 2022 VMware, Inc.
# SPDX-License-Identifier: Apache License 2.0

from django.contrib import admin
from .models import Host, Deployment


class HostAdmin(admin.ModelAdmin):
    list_display = [
        'uuid', 'ipaddr', 'sshport', 'username', 'password', 'deployroot', 'status',
        'capacity', 'current_num', 'deployment', 'startport'
    ]
    # readonly_fields = ('current_num', 'deployment')


admin.site.register(Host, HostAdmin)


class DeploymentAdmin(admin.ModelAdmin):
    list_display = [f.name for f in Deployment._meta.get_fields()]
    readonly_fields = [f.name for f in Deployment._meta.get_fields()]


admin.site.register(Deployment, DeploymentAdmin)
