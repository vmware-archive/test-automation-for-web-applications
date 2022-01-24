# Copyright 2022 VMware, Inc.
# SPDX-License-Identifier: Apache License 2.0

from .models import Deployment
from rest_framework import serializers


class DeploymentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Deployment
        fields = [f.name for f in Deployment._meta.get_fields()]