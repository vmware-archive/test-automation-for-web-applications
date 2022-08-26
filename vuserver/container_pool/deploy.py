# Copyright 2022 VMware, Inc.
# SPDX-License-Identifier: Apache License 2.0

import logging
import os
import random
import subprocess
import tarfile
import time
from multiprocessing import Pool

import paramiko
from django.conf import settings
from fabric import Connection

from .models import Deployment
from .serializers import DeploymentSerializer

logger = logging.getLogger('pool')


def run_command(command):
    subprocess.Popen(command, shell=True)


def stop_deployment(d):
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    logger.info('stopping: {}-{} on {}'.format(d.apptype, d.consoleid, d.host))
    ssh.connect(d.host, 22, 'root', 'v')
    remote_root = '/root/'
    remote_path = os.path.join(remote_root, d.deploypath)
    composer_command = "cd {0}; docker-compose down".format(remote_path)
    stdin, stdout, stderr = ssh.exec_command(composer_command)
    res, err = stdout.read(), stderr.read()
    result = res if res else err
    logger.info(
        'composer_command output: {}, {}'.format(composer_command, result))
    ssh.close()


def get_remote_busy_ports(host, user, passwd):
    busy_ports = []
    netstat_command = "lsof -i -P -n | grep LISTEN| grep TCP |awk '{print $9}'"
    console_output = None
    try:
        conn = Connection(host, user=user, connect_kwargs={'password': passwd},
                          connect_timeout=5)
        console_output = conn.run(netstat_command, hide=True).stdout
        conn.close()
    except Exception:
        if conn:
            conn.close()
    if not console_output:
        return busy_ports
    for line in console_output.splitlines():
        items = line.split(':')
        if len(items) > 0:
            try:
                busy_ports += [
                    int(items[-1].strip()),
                ]
            except Exception:
                pass
    return busy_ports


def get_local_busy_ports():
    busy_ports = []
    netstat_command = "lsof -i -P -n | grep LISTEN| grep TCP |awk '{print $9}'"
    val = os.popen(netstat_command)
    for line in val.readlines():
        items = line.split(':')
        if len(items) > 0:
            try:
                busy_ports += [
                    int(items[-1].strip()),
                ]
            except Exception:
                pass
    return busy_ports


def start_consoles(consoles, pool='default'):
    pool_settings = settings.CONSOLE_POOLS.get(pool, {})
    if not pool_settings:
        return {'message': 'Failed, invalid pool.'}

    pool_type = pool_settings.get('type', '')
    if pool_type not in ['localhost', "remote"]:
        return {'message': 'Failed, invalid pool type.'}

    deployments = {}
    if pool_type == 'localhost':
        busy_ports = get_local_busy_ports()
        all_resources = []
        startport = settings.CONSOLE_POOLS[pool].get('startport', 6950)
        for index in range(0, 20):
            port = startport + index
            if port not in busy_ports:
                all_resources.append(index)
        if len(all_resources) < len(consoles):
            return {
                'message': 'Lack of resource: {0} expected, {1} available'.format(
                    len(consoles), len(all_resources))}
        deploy_commands = []
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
                                          apptype=console['apptype'],
                                          status='running',
                                          pooltype=pool_type)
            serializer = DeploymentSerializer(d)
            deployments[str(console['id'])] = serializer.data
            logger.debug('==> localhost start: {}'.format(d.deploypath))
            deploy_path = os.path.join(settings.CONSOLES_ROOT, d.deploypath)
            composer_command = "cd {0}; export PARALLEL_PORT_{1}={2}; docker-compose up -d".format(
                deploy_path, d.consoleid, d.port)
            deploy_commands.append(composer_command)
            # check_command = "docker inspect --format '{{ (index (index .NetworkSettings.Ports \"6901/tcp\") 0).HostPort }}' " +container_name
            # check_commands.append(check_command)

        pool = Pool()
        pool.map(run_command, deploy_commands)

        while True:
            newBusyPorts = get_local_busy_ports()
            if set(expected_ports).issubset(set(newBusyPorts)):
                break

            print('waiting: ', expected_ports, newBusyPorts)
            time.sleep(0.5)
        pool.close()
    elif pool_type == 'remote':
        running_deploys = Deployment.objects.filter(status='running')
        pool_hosts = settings.CONSOLE_POOLS[pool]['hosts'].keys()
        host_deploys = {}
        for deploy in running_deploys:
            if deploy.host not in pool_hosts:
                continue
            if deploy.host not in host_deploys.keys():
                host_deploys[deploy.host] = 0
            host_deploys[deploy.host] += 1

        all_resources = []
        for ph in pool_hosts:
            current_count = host_deploys.get(ph, 0)
            if current_count < 20:
                all_resources += [ph] * (20 - current_count)

        if len(all_resources) < len(consoles):
            return {
                'message': 'Lack of resource: {0} expected, {1} available'.format(
                    len(consoles), len(all_resources))}

        ssh = paramiko.SSHClient()
        ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        for console in consoles:
            logger.debug('console: {}'.format(console))
            deploy_host = random.choice(all_resources)
            all_resources.remove(deploy_host)

            local_path = os.path.join(settings.CONSOLES_ROOT, console['path'])
            remote_root = '/root/'
            remote_path = os.path.join(remote_root, console['path'])

            tar = tarfile.open(local_path + ".tar.gz", "w:gz")
            tar.add(local_path, arcname=os.path.basename(local_path))
            tar.close()

            remote_port = 0
            ssh.connect(str(deploy_host), 22, 'root', 'v')
            if settings.CONSOLE_POOLS[pool].get('upload_console_files',
                                                'false') == 'true':
                ssh.exec_command(
                    "mkdir -p {}".format(os.path.dirname(remote_path)))

                sftp = paramiko.SFTPClient.from_transport(ssh.get_transport())
                sftp = ssh.open_sftp()
                sftp.put(local_path + ".tar.gz", remote_path + ".tar.gz")
                sftp.close()

                tar_command = "tar -C {} -mxzf {}".format(
                    os.path.dirname(remote_path), remote_path + ".tar.gz")
                stdin, stdout, stderr = ssh.exec_command(tar_command)
                res, err = stdout.read(), stderr.read()
                result = res if res else err
                logger.info(
                    'tar_command output: {}, {}'.format(tar_command, result))

                composer_command = "cd {0}; docker-compose up -d && docker ps | grep {1}-{2}".format(
                    remote_path, console['apptype'], console['id'])
                stdin, stdout, stderr = ssh.exec_command(composer_command)
                res, err = stdout.read(), stderr.read()
                result = res.decode() if res else err.decode()
                logger.info(
                    'composer_command output: {}, {}'.format(composer_command,
                                                             result))
                m = result.find('0.0.0.0:')
                n = result.find('->6901')
                if m and n:
                    try:
                        remote_port = int(result[m + 8:n])
                    except Exception:
                        pass

            d = Deployment.objects.create(host=deploy_host,
                                          index=0,
                                          port=remote_port,
                                          deploypath=console['path'],
                                          consoleid=console['id'],
                                          apptype=console['apptype'],
                                          status='running',
                                          pooltype=pool_type)
            # https://ip:port/?password=vncpassword&view_only=false
            serializer = DeploymentSerializer(d)
            deployments[str(console['id'])] = serializer.data
        ssh.close()

    logger.debug('deployments: {}'.format(deployments))
    return {'message': 'success', 'deployments': deployments}


def stop_consoles(deployments):
    ds = Deployment.objects.filter(uuid__in=deployments)
    local_deploy_commands = []
    remote_deployments = []
    # ssh = paramiko.SSHClient()
    # ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    for d in ds:
        if d.pooltype == 'localhost':
            deploy_path = os.path.join(settings.CONSOLES_ROOT, d.deploypath)
            composer_command = f"cd {deploy_path}; export " \
                               f"PARALLEL_PORT_{d.consoleid}={d.port};" \
                               f" docker-compose down"
            local_deploy_commands.append(composer_command)
            d.status = 'stopped'
            d.save()
        elif d.pooltype == 'remote':
            remote_deployments.append(d)
            d.status = 'stopped'
            d.save()

    if local_deploy_commands:
        pool = Pool()
        pool.map_async(run_command, local_deploy_commands)
        pool.close()

    if remote_deployments:
        pool = Pool()
        pool.map_async(stop_deployment, remote_deployments)
        pool.close()

    return {'message': 'success', 'stopped_deployments': deployments}
