# Copyright 2022 VMware, Inc.
# SPDX-License-Identifier: Apache License 2.0

from rest_framework import serializers

from .models import Client, Product, TestCase, UIEvent, Capture, Console


class ClientSerializer(serializers.ModelSerializer):
    class Meta:
        model = Client
        fields = ('id', 'uuid', 'role', 'locale')


class ProductSerializer(serializers.ModelSerializer):
    class Meta:
        model = Product
        fields = ('id', 'name', 'bu_name', 'reported_issue_target',
                  'bug_product_name', 'str_supported_browsers',
                  'str_supported_features', 'hpqc_domain', 'hpqc_project')


class TestCaseSerializer(serializers.ModelSerializer):
    product = serializers.CharField(source='product.name')
    max_event_retry = serializers.IntegerField(required=False)
    createtime = serializers.DateTimeField(format="%Y-%m-%dT%H:%M:%S",
                                           required=False)
    lastruntime = serializers.DateTimeField(format="%Y-%m-%dT%H:%M:%S",
                                            required=False)

    class Meta:
        model = TestCase
        fields = ('id', 'name', 'apptype', 'softdeleted', 'uuid', 'product',
                  'browser', 'status', 'build', 'resolution', 'locales',
                  'leader_locale', 'start_url', 'add_host', 'glossary',
                  'run_id',
                  'user', 'pool', 'max_event_retry', 'accessibility_data',
                  'createtime', 'lastruntime', 'access_urllist')


class UIEventSerializer(serializers.ModelSerializer):
    product = serializers.CharField(source='testcase.product.name',
                                    required=False)
    obj_value = serializers.CharField(trim_whitespace=False, required=False,
                                      allow_blank=True)
    recordtime = serializers.DateTimeField(format="%Y-%m-%dT%H:%M:%S",
                                           required=False)

    class Meta:
        model = UIEvent
        fields = (
            'id', 'testcase', 'testname', 'product', 'run_id', 'event',
            'action',
            'button', 'obj_text', 'obj_class',
            'obj_value', 'obj_x', 'obj_y', 'obj_top', 'obj_left', 'obj_right',
            'obj_bottom', 'obj_selector', 'obj_id',
            'obj_xpath', 'obj_xpath2', 'obj_xpath3', 'obj_scrolltop',
            'obj_scrollleft', 'platform', 'recordtime',
            'obj_assert', 'obj_parent', 'obj_brother', 'obj_child',
            'verify_type',
            'verify_value', 'obj_xpath4',
            'captureid')
        extra_kwargs = {"obj_x": {"trim_whitespace": False}}


class UIEventConfigSerializer(serializers.ModelSerializer):
    obj_value = serializers.CharField(trim_whitespace=False, required=False,
                                      allow_blank=True)

    class Meta:
        model = UIEvent
        fields = (
            'id', 'testname', 'run_id', 'event', 'action', 'button', 'obj_text',
            'obj_class', 'obj_value', 'obj_x',
            'obj_y', 'obj_top', 'obj_left', 'obj_right', 'obj_bottom',
            'obj_selector', 'obj_id', 'obj_xpath',
            'obj_xpath2', 'obj_xpath3', 'obj_xpath4', 'obj_scrolltop',
            'obj_scrollleft', 'obj_assert', 'verify_type',
            'verify_value', 'replayconfig', 'replayoption', 'presleeptime',
            'userxpath')


class UIEventOpenSerializer(serializers.ModelSerializer):
    openurl = serializers.CharField(source='obj_xpath')

    class Meta:
        model = UIEvent
        fields = ('id', 'action', 'openurl')


class UIEventDirectSerializer(serializers.ModelSerializer):
    openurl = serializers.CharField(source='obj_xpath')

    class Meta:
        model = UIEvent
        fields = ('id', 'action', 'openurl')


class UIEventMousedownSerializer(serializers.ModelSerializer):
    class Meta:
        model = UIEvent
        fields = (
            "id", "action", "obj_value", "button", "obj_x", "obj_y",
            "obj_selector",
            "obj_id", "obj_xpath", "obj_xpath2",
            "obj_xpath3", "obj_xpath4", "verify_value", "percentX", "percentY")


class UIEventKeydownSerializer(serializers.ModelSerializer):
    key = serializers.CharField(source='obj_x')

    class Meta:
        model = UIEvent
        fields = ('id', 'action', 'key')


class UIEventTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = UIEvent
        fields = (
            "id", "action", "obj_value", "obj_selector", "obj_id", "obj_xpath",
            "obj_xpath2", "obj_xpath3", "obj_xpath4",
            "verify_value")


class UIEventScreenshotSerializer(serializers.ModelSerializer):
    areatype = serializers.CharField(source='obj_assert')
    name = serializers.CharField(source='obj_text')

    class Meta:
        model = UIEvent
        fields = ('id', 'action', 'areatype', 'name')


class UIEventElementScreenshotSerializer(serializers.ModelSerializer):
    areatype = serializers.CharField(source='obj_assert')
    name = serializers.CharField(source='obj_text')

    class Meta:
        model = UIEvent
        fields = (
            'id', 'action', 'areatype', 'name', "obj_value", "obj_selector",
            "obj_id", "obj_xpath", "obj_xpath2",
            "obj_xpath3", "obj_xpath4", "verify_value")


class UIEventMouseoverSerializer(serializers.ModelSerializer):
    class Meta:
        model = UIEvent
        fields = (
            "id", "action", "obj_value", "button", "obj_x", "obj_y",
            "obj_selector",
            "obj_id", "obj_xpath", "obj_xpath2",
            "obj_xpath3", "obj_xpath4", "verify_value", "percentX", "percentY")


class UIEventSelectSerializer(serializers.ModelSerializer):
    reference = serializers.CharField(source='obj_text')

    class Meta:
        model = UIEvent
        fields = (
            "id", "action", "obj_value", "obj_selector", "obj_id", "obj_xpath",
            "obj_xpath2", "obj_xpath3", "obj_xpath4",
            "verify_value", "reference", "percentX", "percentY")


class UIEventAssertSerializer(serializers.ModelSerializer):
    class Meta:
        model = UIEvent
        fields = (
            "id", "action", "obj_value", "obj_selector", "obj_id", "obj_xpath",
            "obj_xpath2", "obj_xpath3", "obj_xpath4",
            "verify_value", "obj_assert")


class UIEventExecuteSerializer(serializers.ModelSerializer):
    host = serializers.CharField(source='obj_brother')
    command = serializers.CharField(source='verify_value')
    expect = serializers.CharField(source='obj_child')
    name = serializers.CharField(source='obj_parent')

    class Meta:
        model = UIEvent
        fields = ("id", "action", "host", "command", "expect", "name")


class UIEventAccessibilitySerializer(serializers.ModelSerializer):
    class Meta:
        model = UIEvent
        fields = (
            "id", "action", "obj_value", "obj_selector", "obj_id", "obj_xpath",
            "obj_xpath2", "obj_xpath3", "obj_xpath4",
            "verify_value")


class UIEventBrowserpromptSerializer(serializers.ModelSerializer):
    prompt_type = serializers.CharField(source='obj_text')
    prompt_value = serializers.CharField(source='obj_value')

    class Meta:
        model = UIEvent
        fields = ("id", "action", "prompt_type", "prompt_value")


class UIEventTabswitchSerializer(serializers.ModelSerializer):
    class Meta:
        model = UIEvent
        fields = ("id", "action")


class CaptureSerializer(serializers.ModelSerializer):
    capturetime = serializers.DateTimeField(format="%Y-%m-%dT%H:%M:%S",
                                            required=False)

    class Meta:
        model = Capture
        fields = ('captureid', 'content', 'capturetime')


class ConsoleSerializer(serializers.ModelSerializer):
    createtime = serializers.DateTimeField(format="%Y-%m-%dT%H:%M:%S",
                                           required=False)
    runtime = serializers.DateTimeField(format="%Y-%m-%dT%H:%M:%S",
                                        required=False)
    starttime = serializers.DateTimeField(format="%Y-%m-%dT%H:%M:%S",
                                          required=False)
    stoptime = serializers.DateTimeField(format="%Y-%m-%dT%H:%M:%S",
                                         required=False)

    class Meta:
        model = Console
        fields = tuple([f.name for f in Console._meta.get_fields()] + [
            'report',
            'vnc_host',
            'vnc_port',
            'vnc_protocol',
        ])


class SimpleConsoleSerializer(serializers.ModelSerializer):
    createtime = serializers.DateTimeField(format="%Y-%m-%dT%H:%M:%S",
                                           required=False)
    runtime = serializers.DateTimeField(format="%Y-%m-%dT%H:%M:%S",
                                        required=False)
    starttime = serializers.DateTimeField(format="%Y-%m-%dT%H:%M:%S",
                                          required=False)
    stoptime = serializers.DateTimeField(format="%Y-%m-%dT%H:%M:%S",
                                         required=False)

    class Meta:
        model = Console
        fields = ('uuid', 'appname', 'role', 'status',
                  'browser', 'locale', 'resolution',
                  'createtime', 'runtime', 'starttime', 'stoptime',
                  'report', 'vnc_host', 'vnc_port', 'vnc_protocol')
