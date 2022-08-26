# Copyright 2022 VMware, Inc.
# SPDX-License-Identifier: Apache License 2.0

import uuid
from datetime import datetime

from django.db import models


class Script(models.Model):
    uuid = models.UUIDField(default=uuid.uuid4, editable=False)
    id = models.AutoField(u'ID', primary_key=True)
    test_id = models.IntegerField(u'Test ID', default=0)
    run_id = models.IntegerField(u'Run ID', default=0)
    user = models.CharField(u'User', max_length=64, default='')
    product = models.CharField(u'Product', max_length=255, default='')
    name = models.CharField(u'Name', max_length=255, default='')
    template = models.CharField(u'Template', max_length=255, default='')
    path = models.CharField(u'Script Path', max_length=255, default='')
    events = models.TextField(u'User Events',blank=True,null=True,default='')
    description = models.TextField(u'Description', blank=True, null=True, default='')
    createtime = models.DateTimeField(u'Create Time', blank=True, default=datetime.now)
    lastupdate = models.DateTimeField(u'Last Update', blank=True, default=datetime.now)

    def save(self, *args, **kwargs):
        super(Script, self).save(*args, **kwargs)

    def __str__(self):
        return str(self.id)

    class Meta:
        db_table = 'script_script'
        verbose_name = u'Script'
        verbose_name_plural = u'Scripts'
