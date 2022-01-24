# Copyright 2022 VMware, Inc.
# SPDX-License-Identifier: Apache License 2.0

import os
from django.db import models
from datetime import datetime, timedelta
import uuid
from django.conf import settings

#
# Product/TestCase/UIEvent are shared tables;
#
class Product(models.Model):
    id = models.AutoField(u'ID', primary_key=True)
    name = models.CharField(u'Name', unique=True, max_length=255, default='')
    softdeleted = models.BooleanField(u'Soft Deleted', blank=True, default=False)
    bu_name = models.CharField(u'BU name',max_length=255, default='')
    reported_issue_target = models.CharField(u'Bug System',max_length=255, default='bugzilla')
    bug_product_name = models.CharField(u'Bug Product Name',max_length=255, default='')
    supported_browsers = models.CharField(u'Supported Browsers',max_length=512, default="['Chrome']")
    supported_features = models.CharField(u'Supported Features',max_length=512, default="[]")
    replayconfig = models.TextField(u'Replay Config', blank=True, default='')
    hpqc_domain = models.CharField(u'HPQC Domain Name',max_length=255, default='')
    hpqc_project = models.CharField(u'HPQC Project Name',max_length=255, default='')

    def __str__(self):
        return self.name

    def __unicode__(self):
        return self.name

    @property
    def str_supported_browsers(self):
        return ','.join(eval(self.supported_browsers))

    @property
    def str_supported_features(self):
        return ','.join(eval(self.supported_features))

    class Meta:
        verbose_name = u'Product'
        verbose_name_plural = u'Products'
        db_table = 'parallel_product'


class TestCase(models.Model):
    STATUS_RUNNING = u'running'
    STATUS_STOPPED = u'stopped'
    STATUS = ((STATUS_RUNNING, u'running'), (STATUS_STOPPED, u'stopped'))

    BROWSER_CHROME = u'Chrome'
    BROWSER_FIREFOX = u'Firefox'
    BROWSER = ((BROWSER_CHROME, u'Chrome'), (BROWSER_FIREFOX, u'Firefox'))

    APPTYPE_AUTOMATION = u'automation'
    APPTYPE_PARALLEL = u'parallel'
    APPTYPE_ACCESSIBILITY = u'accessibility'
    APPTYPE = ((APPTYPE_AUTOMATION, u'automation'),
               (APPTYPE_PARALLEL, u'parallel'),
               (APPTYPE_ACCESSIBILITY, u'accessibility'))

    id = models.AutoField(u'ID', primary_key=True)
    name = models.CharField(u'Name', max_length=255, default='')
    apptype = models.CharField(u'Application Type', max_length=64, choices=APPTYPE, default=APPTYPE_PARALLEL)
    softdeleted = models.BooleanField(u'Soft Deleted', blank=True, default=False)
    product = models.ForeignKey(Product, db_column='product', blank=True, null=True, verbose_name=u'Product', on_delete=models.SET_NULL)
    browser = models.CharField(u'Browser', max_length=64, choices=BROWSER, default=BROWSER_CHROME)
    testbed = models.CharField(u'Testbed', max_length=255, blank=True, default='')
    uuid = models.CharField(u'UUID', max_length=128, default=uuid.uuid4)
    status = models.CharField(u'Status', max_length=64, choices=STATUS, default=STATUS_STOPPED)
    build_no = models.CharField(u'Build NO.', max_length=256, default='')
    resolution = models.CharField(u'Resolution', max_length=64, default='1280x800')
    locales = models.TextField(u'Locales', default='')
    add_host = models.CharField(u'Add Host', blank=True, max_length=255, default='')
    leader_locale = models.CharField(u'Leader Locale', max_length=64, default='en_US')
    start_url = models.CharField(u'Start URL', max_length=255, default='')
    run_id = models.IntegerField(u'Run Id', blank=True, default=0)
    user = models.CharField(u'User', max_length=64, default='')
    replayconfig = models.TextField(u'Replay Config', blank=True, default='')
    glossary = models.TextField(u'Glossary', blank=True, default='')

    # pool
    pool = models.CharField(u'Pool Name', max_length=255, blank=True, default='')

    access_urllist = models.TextField(u'Accessibility URL List', blank=True, default='')
    accessibility_data = models.TextField(u'Accessibility Data', blank=True, default='') # JSON format: {"waveTaskId": nnn}
    createtime = models.DateTimeField(u'Create Time', blank=True, default=datetime.now)
    lastruntime = models.DateTimeField(u'Last Run Time', blank=True, default=datetime.now)

    def __str__(self):
        return self.name

    @property
    def build(self):
        return self.build_no


    @property
    def max_event_retry(self):
        return 3

    @property
    def user_locales(self):
        locale_starturls = {}
        for lc in eval(self.locales):
            i = lc.find('@')
            if i > 0:
                locale_starturls[lc[:i]] = lc[i+1:]
            else:
                locale_starturls[lc] = ''
        return list(locale_starturls.keys())

    class Meta:
        verbose_name = u'TestCase'
        verbose_name_plural = u'TestCases'
        db_table = 'parallel_testcase'

class UIEvent(models.Model):
    id = models.AutoField(u'ID', primary_key=True)
    testcase = models.ForeignKey(TestCase, blank=True, null=True, related_name='uievents', on_delete=models.CASCADE)
    run_id = models.IntegerField(u'Run Id', blank=True, default=0)
    event = models.CharField(u'Event Type', blank=True, max_length=64, default='')
    action = models.CharField(u'User Action', blank=True, max_length=64, default='')
    button = models.CharField(u'Button', blank=True, max_length=64, default='')
    obj_id = models.CharField(u'Object ID', blank=True, max_length=255, default='')
    obj_text = models.TextField(u'Object Text', blank=True, default='')
    obj_class = models.TextField(u'Object Class', blank=True, default='')
    obj_value = models.TextField(u'Object Value', blank=True, default='')
    obj_vuid = models.CharField(u'Object VUID', blank=True, max_length=32, default='')
    obj_x = models.CharField(u'Object X', blank=True, max_length=16, default='')
    obj_y = models.CharField(u'Object Y', blank=True, max_length=16, default='')
    obj_left = models.CharField(u'Object Left', blank=True, max_length=16, default='')
    obj_top = models.CharField(u'Object Top', blank=True, max_length=16, default='')
    obj_right = models.CharField(u'Object Right', blank=True, max_length=16, default='')
    obj_bottom = models.CharField(u'Object Bottom', blank=True, max_length=16, default='')
    obj_selector = models.CharField(u'Object Selector', blank=True, max_length=255, default='')
    obj_xpath = models.CharField(u'Object XPath', blank=True, max_length=1024, default='')
    obj_xpath2 = models.CharField(u'Object XPath2', blank=True, max_length=1024, default='')
    obj_xpath3 = models.CharField(u'Object XPath3', blank=True, max_length=1024, default='')
    obj_scrolltop = models.CharField(u'Object Scroll Top', blank=True, max_length=16, default='')
    obj_scrollleft = models.CharField(u'Object Scroll Left', blank=True, max_length=16, default='')
    obj_assert = models.TextField(u'Object Assert Value', blank=True, default='')
    # information for special element
    obj_parent =  models.CharField(u'Object Parent Info', blank=True, max_length=1024, default='')
    obj_brother =  models.CharField(u'Object Brother Info', blank=True, max_length=1024, default='')
    obj_child =  models.CharField(u'Object Child Info', blank=True, max_length=1024, default='')
    verify_type = models.CharField(u'Verify Type', blank=True, max_length=64, default='')
    verify_value = models.TextField(u'Verify Value', blank=True, default='')
    captureid = models.CharField(u'Capture ID', max_length=128, blank=True, default='')
    obj_xpath4 = models.TextField(u'Object XPath4', blank=True, default='')
    replayconfig = models.TextField(u'Replay Config', blank=True, default='')
    platform = models.CharField(u'Platform', blank=True, max_length=64, default='')
    recordtime = models.DateTimeField(u'Record Time', blank=True, default=datetime.now)

    def __str__(self):
        return self.event + '/' + str(self.id)

    @property
    def testname(self):
        return self.testcase.name

    @property
    def replayoption(self):
        default_option = 'hard'
        if self.action == 'assert':
            default_option = 'soft'
        return default_option

    @property
    def presleeptime(self):
        return 1000

    @property
    def userxpath(self):
        return ''

    @property
    def percentX(self):
        percentage_x = 0.10
        if(len(self.obj_x)*len(self.obj_y)*len(self.obj_left)*len(self.obj_top)*len(self.obj_right)*len(self.obj_bottom)==0):
            return percentage_x
        offset_x = round((float(self.obj_x)-float(self.obj_left)),3)
        width = round((float(self.obj_right)-float(self.obj_left)),3)
        if(offset_x * width > 0):
            percentage_x = round(offset_x/width,3)
        else:
            percentage_x = 0.10
        return percentage_x

    @property
    def percentY(self):
        percentage_y=0.10
        if(len(self.obj_x)*len(self.obj_y)*len(self.obj_left)*len(self.obj_top)*len(self.obj_right)*len(self.obj_bottom)==0):
            return percentage_y
        offset_y=round((float(self.obj_y)-float(self.obj_top)),3)
        height=round((float(self.obj_bottom)-float(self.obj_top)),3)

        if(offset_y * height > 0):
            percentage_y = round(offset_y/height,3)
        else:
            percentage_y=0.10
        return percentage_y

    class Meta:
        verbose_name = u'UIEvent'
        verbose_name_plural = u'UIEvents'
        db_table = 'parallel_uievent'

class Client(models.Model):
    id = models.AutoField(u'ID', primary_key=True)
    uuid = models.CharField(u'UUID', max_length=128, default='')
    connecttime = models.DateTimeField(u'Connect Time', default=datetime.now)
    role = models.CharField(u'Role', max_length=64, default='')
    locale = models.CharField(u'Locale', max_length=64, default='')
    testcase = models.ForeignKey(TestCase, related_name='clients', on_delete=models.CASCADE)
    starttime = models.DateTimeField(u'Create Time', blank=True, default=datetime.now)

    def __str__(self):
        return self.uuid

    class Meta:
        verbose_name = u'Client'
        verbose_name_plural = u'Clients'
        db_table = 'parallel_client'


class Capture(models.Model):
    captureid = models.CharField(u'UUID', max_length=128, default='')
    content = models.TextField(u'Capture Content', blank=True, default='')
    screenshot = models.CharField(u'Screenshot Path', max_length=256, default='')
    consoleid = models.CharField(u'Console ID', max_length=256, default='')
    capture = models.CharField(u'Capture Path', max_length=256, default='')
    capturetime = models.DateTimeField(u'Capture Time', default=datetime.now)

    def __str__(self):
        return self.captureid

    class Meta:
        verbose_name = u'Capture'
        verbose_name_plural = u'Captures'
        db_table = 'parallel_capture'


class Console(models.Model):
    STATUS_INIT = u'init'
    STATUS_RUNNING = u'running'
    STATUS_STOPPED = u'stopped'
    STATUS_ABORTED = u'aborted'
    STATUS = ((STATUS_INIT, u'init'), (STATUS_RUNNING, u'running'),
              (STATUS_STOPPED, u'stopped'), (STATUS_ABORTED, u'aborted'))

    id = models.AutoField(u'ID', primary_key=True)
    uuid = models.UUIDField(default=uuid.uuid4, editable=False)
    apptype = models.CharField(u'App Type', max_length=64, blank=True, default='')
    appid = models.CharField(u'Test ID', max_length=256, blank=True, default='')
    appuuid = models.CharField(u'App UUID', max_length=64, default='')
    appname = models.CharField(u'App Name', max_length=256, default='')
    apprunid = models.IntegerField(u'App Run Id', blank=True, default=0)
    appindex = models.IntegerField(u'App Run Index', blank=True, default=0)
    appserver = models.CharField(u'App Server', max_length=256, blank=True, default='')
    appproduct = models.CharField(u'App Product', max_length=256, blank=True, default='')
    appuser = models.CharField(u'App User', max_length=64, default='')
    apppool = models.CharField(u'App Pool', max_length=256, default='')
    host = models.CharField('Host IP', max_length=64, default='')
    role = models.CharField(u'Role', max_length=64, default='')
    port = models.IntegerField(u'Host Port', blank=True, default=0)
    deployment = models.CharField(u'deployment', max_length=256, default='')
    status = models.CharField(u'Status', max_length=64, choices=STATUS, default=STATUS_INIT)
    browser = models.CharField(u'Browser', max_length=64, default='')
    locale = models.CharField(u'Locale', max_length=64, default='')
    resolution = models.CharField(u'Resolution', max_length=64, default='')
    start_url = models.CharField(u'Start URL', max_length=256, default='')
    add_host = models.CharField(u'Add Host', blank=True, max_length=255, default='')
    params = models.TextField(u'Self Parameters', blank=True, default='')
    build_no = models.CharField(u'Build NO.', max_length=256, default='')
    createtime = models.DateTimeField(u'Create Time', blank=True, default=datetime.now)
    runtime = models.DateTimeField(u'Run Time', blank=True, default=datetime.now) # for schedule
    starttime = models.DateTimeField(u'Start Time', blank=True, default=datetime.now) # lastruntime of Replay
    stoptime = models.DateTimeField(u'Stop Time', blank=True, default=datetime.now) # resource usage: starttime-stoptime
    expiretime = models.DateTimeField(u'Expire Time', blank=True, default=datetime.now()+timedelta(days=90)) # report expire time
    report_status = models.CharField(u'Report Status', max_length=256, blank=True, default='0')

    def __str__(self):
        return str(self.id)

    @property
    def report(self):
        report_link = ''
        report_ipaddr = settings.REPORTS_SERVER
        console_date = self.createtime.strftime('%Y%m%d')
        report_folder = str(self.id) + "@" + self.appuuid
        report_link = ''
        if self.status == 'stopped':
            report_ipaddr = settings.REPORTS_SERVER + "/" + console_date
            report_link = 'http://%s/%s/reports/' % (report_ipaddr, report_folder)

        return report_link

    @property
    def vnc_host(self):
        return self.host

    @property
    def vnc_port(self):
        return self.port

    @property
    def vnc_protocol(self):
        return 'http'

    class Meta:
        verbose_name = u'Console'
        verbose_name_plural = u'Consoles'