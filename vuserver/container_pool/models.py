# Copyright 2022 VMware, Inc.
# SPDX-License-Identifier: Apache License 2.0

import uuid
from django.db import models
from django.forms import ValidationError
from django.core.exceptions import ObjectDoesNotExist


class Host(models.Model):
    STATUS_AVAILABLE = u'available'
    STATUS_MAINTAINANCE = u'maintainance'
    STATUS = ((STATUS_AVAILABLE, u'available'), (STATUS_MAINTAINANCE, u'maintainance'))

    uuid = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    ipaddr = models.CharField(u'FQDN/IP', max_length=64, default='')
    sshport = models.IntegerField(u'SSH Port', blank=True, default=22)
    username = models.CharField(u'User Name', max_length=64, default='root')
    password = models.CharField(u'Password', max_length=64, default='v')
    deployroot = models.CharField(u'Deployment Root', max_length=256, blank=True, default='/root')
    status = models.CharField(u'Status', max_length=64, choices=STATUS, blank=True, default=STATUS_MAINTAINANCE)

    capacity = models.IntegerField(u'Capacity', blank=True, default=20)
    startport = models.IntegerField(u'Start Port', blank=True, default=6950)
    current_num = models.IntegerField(u'Deployed Number', blank=True, default=0)
    deployment = models.CharField(u'Deployment', max_length=256, blank=True, default='')

    def __str__(self):
        return self.ipaddr

    def save(self, *args, **kwargs):
        if not self.ipaddr:
            raise ValidationError('Error: FQDN/IP is needed.')
        if self.status == 'maintainance':
            if self.current_num == 0:
                self.deployment = '0' * self.capacity
            else:
                raise ValidationError('Error: Change to maintainance mode failed, current_num is not 0.')
        else:
            # available
            if self.current_num == 0:
                self.deployment = '0' * self.capacity
            if self.pk is not None:
                # update
                try:
                    orig = Host.objects.get(pk=self.pk)
                    if orig.capacity != self.capacity:
                        raise ValidationError('Error: Cannot change capacity when host is available.')
                except ObjectDoesNotExist:
                    pass
        super(Host, self).save(*args, **kwargs)

    class Meta:
        verbose_name = u'Host'
        verbose_name_plural = u'Hosts'


class Deployment(models.Model):
    uuid = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    host = models.CharField('Host FQDN/IP', max_length=256, default='')
    index = models.IntegerField(u'Host Index Number', blank=True, default=-1)
    port = models.IntegerField(u'Host Port', blank=True, default=0)
    deploypath = models.CharField(u'Deployment Path', max_length=256, blank=True, default='')
    consoleid = models.IntegerField(u'Console ID', blank=True, default=0)
    apptype = models.CharField(u'User Name', max_length=64, default='')

    def __str__(self):
        return self.uuid

    class Meta:
        verbose_name = u'Deployment'
        verbose_name_plural = u'Deployments'