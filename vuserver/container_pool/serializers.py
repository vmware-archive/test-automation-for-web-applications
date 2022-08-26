# Copyright 2022 VMware, Inc.
# SPDX-License-Identifier: Apache License 2.0

from rest_framework import serializers

from .models import Deployment


class DeploymentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Deployment
        fields = [f.name for f in Deployment._meta.get_fields()]