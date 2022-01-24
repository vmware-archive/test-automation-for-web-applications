# Copyright 2022 VMware, Inc.
# SPDX-License-Identifier: Apache License 2.0

from django.contrib import admin
from .models import Script


class ScriptAdmin(admin.ModelAdmin):
    list_display = [f.name for f in Script._meta.get_fields()]
    list_filter = ('product', )


admin.site.register(Script, ScriptAdmin)