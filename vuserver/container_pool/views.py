# Copyright 2022 VMware, Inc.
# SPDX-License-Identifier: Apache License 2.0

import logging

from django.conf import settings
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_tracking.mixins import LoggingMixin

from .deploy import start_consoles, stop_consoles

logger = logging.getLogger('pool')


class Pools(APIView):
    swagger_schema = None
    """
    List all pools.
    """

    def get(self, request, **kwargs):
        pool_hosts = settings.CONSOLE_POOLS if settings.CONSOLE_POOLS else '{}'
        return Response({'message': 'success', 'data': pool_hosts})


class DeployStart(LoggingMixin, APIView):
    swagger_schema = None
    """
    Start an deploy.
    """
    logging_methods = [
        'POST',
    ]

    def post(self, request):
        pool = request.data.get('pool', settings.DEFAULT_POOL)  # *
        consoles = request.data.get('consoles', [])  # *
        message = start_consoles(consoles, pool)
        return Response(message)


class DeployStop(LoggingMixin, APIView):
    swagger_schema = None
    """
    Stop deployments.
    """
    logging_methods = [
        'POST',
    ]

    def post(self, request):
        deployments = request.data.get('deployments', [])  # *
        message = stop_consoles(deployments)
        return Response(message)
