# Copyright 2022 VMware, Inc.
# SPDX-License-Identifier: Apache License 2.0

from django.contrib import admin
from .models import Product, TestCase, UIEvent, Client, Capture, Console


class ProductAdmin(admin.ModelAdmin):
    list_display = ('name', 'bu_name', 'reported_issue_target',
                    'bug_product_name', 'supported_browsers',
                    'supported_features', 'hpqc_domain', 'hpqc_project')


admin.site.register(Product, ProductAdmin)


class TestCaseAdmin(admin.ModelAdmin):
    list_display = ('id', 'name', 'apptype', 'product', 'uuid', 'status',
                    'resolution', 'locales', 'start_url', 'run_id')


admin.site.register(TestCase, TestCaseAdmin)


class UIEventAdmin(admin.ModelAdmin):
    list_display = ('id', 'testcase', 'run_id', 'verify_value', 'event',
                    'action', 'obj_text', 'obj_x', 'obj_y', 'obj_xpath',
                    'obj_value', 'recordtime')
    list_filter = ('testcase', )


admin.site.register(UIEvent, UIEventAdmin)


class ClientAdmin(admin.ModelAdmin):
    list_display = [f.name for f in Client._meta.get_fields()]


admin.site.register(Client, ClientAdmin)


class CaptureAdmin(admin.ModelAdmin):
    list_display = ('id', 'captureid', 'screenshot', 'capturetime')


admin.site.register(Capture, CaptureAdmin)


class ConsoleAdmin(admin.ModelAdmin):
    list_display = [f.name for f in Console._meta.get_fields()]


admin.site.register(Console, ConsoleAdmin)