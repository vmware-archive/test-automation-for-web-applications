# Copyright 2022 VMware, Inc.
# SPDX-License-Identifier: Apache License 2.0

from django.core.exceptions import FieldError
from django.http import Http404
from rest_framework.response import Response
from rest_framework import status
from rest_framework.views import APIView
from django.db.models import Q, F, Count, Sum
from django.db import transaction
from datetime import datetime, timezone, timedelta
import random
from rest_framework_tracking.mixins import LoggingMixin
import requests
from django.conf import settings
import shutil
import os
import json
from .models import Host, Deployment
from .serializers import DeploymentSerializer
from fabric import Connection
import logging

logger = logging.getLogger('pool')

class Pools(APIView):
    swagger_schema = None
    """
    List all pools.
    """
    def get(self, request, **kwargs):
        pool_hosts = settings.POOL_HOSTS if settings.POOL_HOSTS else '{}'
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
        pool = request.data.get('pool', 'default')  # *
        consoles = request.data.get('consoles', [])  # *

        return Response({'message': 'blocked.'})

        pool_settings = settings.POOL_HOSTS.get(pool, {})
        if not pool_settings:
            return Response({'message': 'Failed, invalid pool.'})

        pool_type = pool_settings.get('type', '')
        if pool_type not in ['localhost',]:
            return Response({'message': 'Failed, invalid pool type.'})

        running_consoles = {}
        if pool_type == 'localhost':
            busyPorts = []
            netstat_command = "netstat -anp | grep LISTEN | grep tcp |awk '{print $4}'"
            val = os.popen(netstat_command)
            for line in val.readlines():
                items = line.split(':')
                if len(items) > 0:
                    try:
                        busyPorts += [
                            int(items[-1].strip()),
                        ]
                    except Exception:
                        pass
            all_resources = []
            startport = settings.POOL_HOSTS[pool].get('startport', '6950')
            for index in range(0, 20):
                port = startport + index
                if port not in busyPorts:
                    all_resources.append(index)
            if len(all_resources) < len(consoles):
                    return Response(
                        {'message': 'Lack of resource: {0} expected, {1} available'.format(len(consoles), len(all_resources))})
            for console in consoles:
                logger.debug('console: {}'.format(console))
                user_index = random.choice(all_resources)
                all_resources.remove(user_resource)
                d = Deployment.objects.create(host=settings.LOCALHOST_IP,
                                            index=user_index,
                                            port=startport + user_index,
                                            deploypath=console['path'],
                                            consoleid=console['id'],
                                            apptype=console['type'])
                serializer = DeploymentSerializer(d)
                running_consoles[str(console['id'])] = serializer.data

                logger.debug('==> localhost start: {}'.format(d.deploypath))
        elif pool_type == 'hosts':
            pool_hosts = settings.POOL_HOSTS[pool].get('hosts', [])
            if not pool_hosts:
                return Response({'message': 'Failed, no host in current pool.'})

            all_resources = []
            # resources_list = []
            with transaction.atomic():
                all_hosts = Host.objects.select_for_update().filter(status='available',
                                                                    capacity__gt=F('current_num'),
                                                                    ipaddr__in=pool_hosts)
                for host in all_hosts:
                    for i in range(len(host.deployment)):
                        if host.deployment[i] == '1':
                            continue
                        all_resources += [
                            {
                                'ipaddr': host.ipaddr,
                                'i': i,
                                'host': host
                            },
                        ]
                # print(all_resources, consoles)
                if len(all_resources) < len(consoles):
                    return Response(
                        {'message': 'Lack of resource: {0} expected, {1} available'.format(len(consoles), len(all_resources))})

                for console in consoles:
                    logger.debug('console: {}'.format(console))
                    user_resource = random.choice(all_resources)
                    all_resources.remove(user_resource)
                    d = Deployment.objects.create(host=user_resource['ipaddr'],
                                                index=user_resource['i'],
                                                port=user_resource['i'] + user_resource['host'].startport,
                                                deploypath=console['path'],
                                                consoleid=console['id'],
                                                apptype=console['type'])
                    user_host = user_resource['host']
                    serializer = DeploymentSerializer(d)
                    running_consoles[str(console['id'])] = serializer.data

                    # update host
                    idx = user_resource['i']
                    user_host.deployment = user_host.deployment[:idx] + '1' + user_host.deployment[idx + 1:]
                    user_host.current_num += 1
                    user_host.starttime = datetime.now()
                    user_host.save()

                    logger.debug('==> {} start: {}'.format(d.host, d.deploypath))
            
            # try:
            #     conn = Connection(console.host.ipaddr,
            #                       user=settings.DOCKER_USERNAME,
            #                       connect_kwargs={'password': settings.DOCKER_PASSWORD})
            #     result = conn.run(docker_run_command, hide=True)
            #     conn.close()
            #     if result.ok:
            #         return 'success'
            # except Exception:
            #     return 'start container failed'
        logger.debug('running_consoles: {}'.format(running_consoles))
        return Response({'message': 'success', 'running_consoles': running_consoles})


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
        return Response({'message': 'blocked.'})

        logger.debug('deployments: {0}'.format(deployments))

        ds = Deployment.objects.filter(uuid__in=deployments)
        for d in ds:
            with transaction.atomic():
                if d.host == 'localhost':
                    logger.debug('==> stop: {}'.format(d.deploypath))
                else:
                    logger.debug('==> {} stop: {}'.format(d.host, d.deploypath))
                    user_hosts = Host.objects.select_for_update().filter(ipaddr=d.host)
                    if len(user_hosts) > 0:
                        user_host = user_hosts[0]
                        idx = d.index
                        if idx >= 0:
                            user_host.deployment = user_host.deployment[:idx] + '0' + user_host.deployment[idx + 1:]
                            user_host.current_num -= 1
                            user_host.save()

                    # resources = []
                    # # resources_list = []
                    # with transaction.atomic():
                    #     all_hosts = Host.objects.select_for_update().filter(status='available',
                    #                                                         max_capacity__gt=F('current_num')).exclude(ipaddr='')
                    #     if init_consoles[0].apppool:
                    #         all_hosts = all_hosts.filter(pool__name=init_consoles[0].apppool)
                    #     else:
                    #         all_hosts = all_hosts.filter(pool=None)
                    # try:
                    #     conn = Connection(console.host.ipaddr, user=settings.DOCKER_USERNAME, connect_kwargs={'password': settings.DOCKER_PASSWORD})
                    #     result = conn.run(docker_run_command, hide=True)
                    #     conn.close()
                    #     if result.ok:
                    #         return 'success'
                    # except Exception:
                    #     return 'start container failed'

        return Response({'message': 'success', 'stopped_deployments': deployments})
        
