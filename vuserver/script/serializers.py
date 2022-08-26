# Copyright 2022 VMware, Inc.
# SPDX-License-Identifier: Apache License 2.0

from rest_framework import serializers

from .models import Script


class ScriptSerializer(serializers.ModelSerializer):
    class Meta:
        model = Script
        fields = ('id', 'name', 'user', 'test_id', 'run_id', 'product',
                  'template', 'path', 'createtime', 'lastupdate')
