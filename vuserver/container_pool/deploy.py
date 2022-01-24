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
import sys
import json
import time
from .models import Host, Deployment
from .serializers import DeploymentSerializer
from fabric import Connection
import logging
from multiprocessing import Pool, Process
import subprocess
logger = logging.getLogger('pool')


def run_command(command):
    subprocess.Popen(command, shell=True)

def getRemoteBusyPorts(self, host, user, passwd):
    busyPorts = []
    netstat_command = "lsof -i -P -n | grep LISTEN| grep TCP |awk '{print $9}'"
    console_output = None
    try:
        conn = Connection(host, user=user, connect_kwargs={'password': passwd}, connect_timeout=5)
        console_output = conn.run(netstat_command, hide=True).stdout
        conn.close()
    except Exception:
        if conn:
            conn.close()
    if not console_output:
        return busyPorts
    for line in console_output.splitlines():
        items = line.split(':')
        if len(items) > 0:
            try:
                busyPorts += [
                    int(items[-1].strip()),
                ]
            except Exception:
                pass
    return busyPorts


def getLocalBusyPorts():
    busyPorts = []
    netstat_command = "lsof -i -P -n | grep LISTEN| grep TCP |awk '{print $9}'"
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
    return busyPorts

def startConsoles(consoles, pool='default'):
    pool_settings = settings.POOL_HOSTS.get(pool, {})
    if not pool_settings:
        return {'message': 'Failed, invalid pool.'}

    pool_type = pool_settings.get('type', '')
    if pool_type not in ['localhost',]:
        return {'message': 'Failed, invalid pool type.'}

    running_consoles = {}
    if pool_type == 'localhost':
        busyPorts = getLocalBusyPorts()
        all_resources = []
        startport = settings.POOL_HOSTS[pool].get('startport', 6950)
        for index in range(0, 20):
            port = startport + index
            if port not in busyPorts:
                all_resources.append(index)
        if len(all_resources) < len(consoles):
                return {'message': 'Lack of resource: {0} expected, {1} available'.format(len(consoles), len(all_resources))}
        deploy_commands = []
        check_commands = []
        expected_ports = []
        for console in consoles:
            logger.debug('console: {}'.format(console))
            user_index = random.choice(all_resources)
            expected_ports.append(startport + user_index)
            all_resources.remove(user_index)
            d = Deployment.objects.create(host=settings.LOCALHOST_IP,
                                        index=user_index,
                                        port=startport + user_index,
                                        deploypath=console['path'],
                                        consoleid=console['id'],
                                        apptype=console['type'])
            serializer = DeploymentSerializer(d)
            running_consoles[str(console['id'])] = serializer.data
            logger.debug('==> localhost start: {}'.format(d.deploypath))
            container_name = console['type'] + '-' + str(console['id'])
            deploy_path = os.path.join(settings.STORAGE_ROOT, 'parallel', d.deploypath)
            composer_command = "cd {0}; export PARALLEL_PORT_{1}={2}; docker-compose up -d".format(deploy_path, d.consoleid, d.port)
            deploy_commands.append(composer_command)
            # check_command = "docker inspect --format '{{ (index (index .NetworkSettings.Ports \"6901/tcp\") 0).HostPort }}' " +container_name
            # check_commands.append(check_command)

        pool = Pool()
        pool.map(run_command, deploy_commands)

        while True:
            newBusyPorts = getLocalBusyPorts()
            if set(expected_ports).issubset(set(newBusyPorts)):
                break

            print('waiting: ', expected_ports, newBusyPorts)
            time.sleep(0.5)
    elif pool_type == 'hosts':
        pass
        # pool_hosts = settings.POOL_HOSTS[pool].get('hosts', [])
        # if not pool_hosts:
        #     return {'message': 'Failed, no host in current pool.'}

        # all_resources = []
        # # resources_list = []
        # with transaction.atomic():
        #     all_hosts = Host.objects.select_for_update().filter(status='available',
        #                                                         capacity__gt=F('current_num'),
        #                                                         ipaddr__in=pool_hosts)
        #     for host in all_hosts:
        #         for i in range(len(host.deployment)):
        #             if host.deployment[i] == '1':
        #                 continue
        #             all_resources += [
        #                 {
        #                     'ipaddr': host.ipaddr,
        #                     'i': i,
        #                     'host': host
        #                 },
        #             ]
        #     # print(all_resources, consoles)
        #     if len(all_resources) < len(consoles):
        #         return {'message': 'Lack of resource: {0} expected, {1} available'.format(len(consoles), len(all_resources))}

        #     for console in consoles:
        #         logger.debug('console: {}'.format(console))
        #         user_resource = random.choice(all_resources)
        #         all_resources.remove(user_resource)
        #         d = Deployment.objects.create(host=user_resource['ipaddr'],
        #                                     index=user_resource['i'],
        #                                     port=user_resource['i'] + user_resource['host'].startport,
        #                                     deploypath=console['path'],
        #                                     consoleid=console['id'],
        #                                     apptype=console['type'])
        #         user_host = user_resource['host']
        #         serializer = DeploymentSerializer(d)
        #         running_consoles[str(console['id'])] = serializer.data

        #         # update host
        #         idx = user_resource['i']
        #         user_host.deployment = user_host.deployment[:idx] + '1' + user_host.deployment[idx + 1:]
        #         user_host.current_num += 1
        #         user_host.starttime = datetime.now()
        #         user_host.save()

        #         logger.debug('==> {} start: {}'.format(d.host, d.deploypath))
    logger.debug('running_consoles: {}'.format(running_consoles))
    return {'message': 'success', 'running_consoles': running_consoles}

def stopConsoles(deployments, pool='default'):
    pool_settings = settings.POOL_HOSTS.get(pool, {})
    if not pool_settings:
        return {'message': 'Failed, invalid pool.'}

    pool_type = pool_settings.get('type', '')
    if pool_type not in ['localhost',]:
        return {'message': 'Failed, invalid pool type.'}

    ds = Deployment.objects.filter(uuid__in=deployments)
    deploy_commands = []
    if pool_type == 'localhost':
        for d in ds:
            deploy_path = os.path.join(settings.STORAGE_ROOT, 'parallel', d.deploypath)
            composer_command = "cd {0}; export PARALLEL_PORT_{1}={2}; docker-compose down".format(deploy_path, d.consoleid, d.port)
            deploy_commands.append(composer_command)
        pool = Pool()
        pool.map_async(run_command, deploy_commands)
    elif pool_type == 'hosts':
        pass
        # for d in ds:
        #     with transaction.atomic():
        #         logger.debug('==> {} stop: {}'.format(d.host, d.deploypath))
        #         user_hosts = Host.objects.select_for_update().filter(ipaddr=d.host)
        #         if len(user_hosts) > 0:
        #             user_host = user_hosts[0]
        #             idx = d.index
        #             if idx >= 0:
        #                 user_host.deployment = user_host.deployment[:idx] + '0' + user_host.deployment[idx + 1:]
        #                 user_host.current_num -= 1
        #                 user_host.save()

    return {'message': 'success', 'stopped_deployments': deployments}
