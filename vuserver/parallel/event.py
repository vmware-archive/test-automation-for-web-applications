# Copyright 2022 VMware, Inc.
# SPDX-License-Identifier: Apache License 2.0

import os
import time
import requests
import json
from datetime import datetime, timezone, timedelta
import base64

from .models import Product, TestCase, Client, Capture, UIEvent, Console
from script.models import Script
from .serializers import ProductSerializer, TestCaseSerializer, ClientSerializer, CaptureSerializer
from .serializers import UIEventSerializer, UIEventConfigSerializer
from script.serializers import ScriptSerializer
from script.views import getScriptEvents

from django.http import Http404
from django.shortcuts import render
from django.contrib.auth.decorators import login_required
from django.db.models import Q, F, Count
from django.db import transaction
from django.contrib.auth.models import User
from django.views.decorators.csrf import csrf_exempt

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.decorators import api_view
from django.conf import settings
from .consumers import send_ws_message, send_ws_status
import logging
logger = logging.getLogger('parallel')

def adjust_events(events):
    """
    Event filtering based on general rules
    returns:
        exclude_ids: events to be excluded
        capture_ids: captures for input events
        last_event: last event from input events
    """
    exclude_ids = []
    capture_ids = []
    last_event = None
    last_mousedown = None
    mousedown_events = []
    for evt in events:
        if not last_event:
            last_event = evt
            continue
        # special bug fixes
        # if (evt.obj_class == 'login-group') and (evt.obj_xpath2 == '/HTML[1]/BODY[1]/DIV[1]/DIV[1]/FORM[1]/DIV[1]'):
        #     exclude_ids += [evt.id, ]
        #     continue

        last_time_diff = evt.recordtime - last_event.recordtime
        # event type specific adjustment
        if evt.event == "11":
            exclude_ids += [
                evt.id,
            ]
            continue
        elif (evt.action == 'select'):
            if (evt.obj_text == ';;-1') or ((evt.obj_value == '') and (evt.obj_text == '')):
                # VIU-1967
                exclude_ids += [
                    evt.id,
                ]
                continue
            if (evt.obj_text == ''):
                mIndex = evt.obj_value.find(':')
                if mIndex > 0:
                    evt.obj_text = evt.obj_value + ';;' + evt.obj_value[:mIndex]
                else:
                    evt.obj_text = evt.obj_value + ';;'
                evt.save()

            # VIU-3669: exclude event which index is not number
            is_exclude = False
            items = evt.obj_text.split(';')
            if len(items) == 3:
                try:
                    tempInt = int(items[2])
                    if str(tempInt) != items[2]:
                        is_exclude = True
                except ValueError:
                    is_exclude = True
            if is_exclude:
                exclude_ids += [
                    evt.id,
                ]
        elif (evt.event == '2'):
            if (evt.obj_value == 'on') and (last_event.event != "10"):
                exclude_ids += [
                    evt.id,
                ]
                continue
            # Comments out: user should use configuration to disable here
            # if last_event.event == '19':
            #     # VIU-2733
            #     if last_time_diff < timedelta(milliseconds=500):
            #         exclude_ids += [evt.id, ]
            #         continue
        elif evt.event == '1':
            # VIU-1730
            if (last_event.event in ['19', '20']):
                if last_time_diff < timedelta(milliseconds=1200):
                    exclude_ids += [
                        evt.id,
                    ]
                    continue
            elif last_event.event == '1':
                # VIU-2655
                if evt.obj_xpath2 != last_event.obj_xpath2:
                    evt.event = '19'
                    evt.action = 'mousedown'
                    evt.save()
                elif last_event.id in exclude_ids:
                    exclude_ids += [
                        evt.id,
                    ]
                    continue
            elif (last_event.event in ['9', '10'] and last_event.obj_x.lower() == 'enter'):
                # VIU-2104
                if last_time_diff < timedelta(milliseconds=120):
                    exclude_ids += [
                        evt.id,
                    ]
                    continue
        elif (evt.event in ['9', '10']):
            if (evt.obj_x == '') and (evt.obj_y == 'Space'):
                evt.obj_x = ' '
                evt.save()
            if (last_event.event == '2') and (evt.obj_x.lower() not in ['enter', 'tab']):
                if last_time_diff < timedelta(milliseconds=10):
                    exclude_ids += [
                        evt.id,
                    ]
                    continue
        elif evt.event == '29':
            if last_event.event == '2':
                # VIU-2593
                if last_time_diff < timedelta(milliseconds=120):
                    evt.recordtime = last_event.recordtime - timedelta(milliseconds=1)
                    evt.save()
        elif (evt.event in ['19', '20']):
            if last_event.event == '1':
                # remove click
                if last_time_diff < timedelta(milliseconds=1200):
                    exclude_ids += [
                        last_event.id,
                    ]
            if evt.event == '19':
                if last_mousedown:
                    if (last_time_diff < timedelta(milliseconds=120)) and (evt.obj_xpath2 == last_mousedown.obj_xpath2):
                        exclude_ids += [
                            evt.id,
                        ]
                        continue
                    else:
                        last_mousedown = evt
                else:
                    last_mousedown = evt
                mousedown_events.append(evt)
            elif evt.event == '20':
                if evt.action == 'select':
                    #VIU-3296
                    last_event = evt
                    continue
                if len(mousedown_events) == 0:
                    exclude_ids += [
                        evt.id,
                    ]
                    continue
                md = mousedown_events.pop()
                # if (md.obj_xpath != evt.obj_xpath) and (md.obj_xpath2 != evt.obj_xpath2) and (md.obj_xpath3 != evt.obj_xpath3):
                #     # not a pair
                #     mousedown_events.append(md)
        last_event = evt
        if evt.captureid:
            capture_ids += [
                evt.captureid,
            ]

    # exclude redundant mousedown events
    for md in mousedown_events:
        exclude_ids += [
            md.id,
        ]

    return exclude_ids, capture_ids, last_event


class EventsbyIDs(APIView):
    """
    Get events by ids.
    """
    @csrf_exempt
    def dispatch(self, *args, **kwargs):
        return super(EventsbyIDs, self).dispatch(*args, **kwargs)

    def post(self, request):
        ids = request.data.get('ids', [])
        events = UIEvent.objects.filter(id__in=ids)
        serializer = UIEventConfigSerializer(events, many=True)
        return Response({'message': 'success', 'uievents': serializer.data})


class EventsbyScript(APIView):
    """
    Get events by script id.
    """
    def get(self, request, scriptid, format=None):
        scripts = Script.objects.filter(id=scriptid)
        if not len(scripts):
            return Response({'results': []})
        current_script = scripts[0]
        t_id = current_script.test_id
        r_id = current_script.run_id
        testcases = TestCase.objects.filter(id=t_id)
        if not len(testcases):
            return Response({'results': []})
        current_testcase = testcases[0]
        events = UIEvent.objects.filter(testcase=current_testcase, run_id=r_id).order_by('recordtime')
        exclude_ids, capture_ids, last_event = adjust_events(events)
        events = events.exclude(id__in=exclude_ids)
        logger.debug("config_events from test_id: {} run_id: {} count: {}".format(t_id, r_id, len(events)))

        serializer = UIEventConfigSerializer(events, many=True)
        return Response({'results': serializer.data, 'script_name': current_script.name})


class SingleRunEvents(APIView):
    """
    Get events of single test run.
    """
    def get(self, request, testcase_id, runid, format=None):
        testcases = TestCase.objects.filter(id=testcase_id)
        if not len(testcases):
            return Response({'message': 'Error TestCase'})
        current_testcase = testcases[0]
        events = UIEvent.objects.filter(testcase=current_testcase, run_id=runid).order_by('recordtime')
        exclude_ids, capture_ids, last_event = adjust_events(events)
        events = UIEvent.objects.filter(testcase=current_testcase,
                                        run_id=runid).order_by('recordtime').exclude(id__in=exclude_ids)
        # append capture
        captures = []
        include_captures = request.GET.get('include_captures', default='')
        if include_captures:
            cs = Capture.objects.filter(captureid__in=capture_ids)
            captures = CaptureSerializer(cs, many=True).data

        serializer = UIEventSerializer(events, many=True)
        return Response({'message': 'success', 'testcase': testcase_id, 'uievents': serializer.data, 'captures': captures})

class SingleRunScriptEvents(APIView):
    """
    Get script events of single test run.
    """
    def get(self, request, testcase_id, runid, format=None):
        testcases = TestCase.objects.filter(id=testcase_id)
        if not len(testcases):
            return Response({'message': 'Error TestCase'})
        current_testcase = testcases[0]

        script_events = getScriptEvents(testcases[0], runid)

        # append capture
        captures = []
        include_captures = request.GET.get('include_captures', default='')
        if include_captures:
            cs = Capture.objects.filter(captureid__in=capture_ids)
            captures = CaptureSerializer(cs, many=True).data

        return Response({'message': 'success', 'testcase': testcase_id, 'uievents': script_events, 'captures': captures})


class LastEvent(APIView):
    """
    Get last event of specific test.
    """
    def get(self, request, testcase_id, format=None):
        testcases = TestCase.objects.filter(id=testcase_id)
        if not len(testcases):
            return Response({'message': 'Error TestCase'})
        current_testcase = testcases[0]
        events = UIEvent.objects.filter(testcase=current_testcase).order_by('-id')

        if len(events) > 0:
            serializer = UIEventSerializer(events[0])
            return Response({'message': 'success', 'data': serializer.data})
        else:
            return Response({'message': 'No Event'})


class StatUIEvents(APIView):
    """
    Stat events of tests.
    """
    def get(self, request, start_tid="", end_tid="", format=None):
        stat = {}
        for testcase_id in range(int(start_tid), int(end_tid) + 1):
            testcases = TestCase.objects.filter(id=testcase_id)
            if not len(testcases):
                continue
            current_testcase = testcases[0]
            for runid in range(1, 201):
                logger.debug('stating: {}, {}'.format(testcase_id, runid))
                events = UIEvent.objects.filter(testcase=current_testcase, run_id=runid).order_by('id')
                opens = events.filter(action='open')
                if not len(events):
                    break
                elif len(opens) > 1:
                    if opens[0].recordtime == opens[1].recordtime:
                        todelete = events.filter(id__gte=opens[1].id)
                        tokeep = events.filter(id__lt=opens[1].id)
                        stat[str(testcase_id) + '_' + str(runid)] = {
                            'total': len(events),
                            'opens': len(opens),
                            '()': str(opens[0].id) + '_' + str(opens[1].id),
                            'todelete': len(todelete),
                            'tokeep': len(tokeep),
                            'delete_stard': todelete[0].id
                        }
                        todelete.delete()
        return Response({'message': 'success', 'stat': stat})



class SearchTextEvents(APIView):
    """
    Get events by ids.
    """
    @csrf_exempt
    def dispatch(self, *args, **kwargs):
        return super(SearchTextEvents, self).dispatch(*args, **kwargs)

    def post(self, request):
        key = request.data.get('key', '')
        scripts = request.data.get('scripts', '')

        if (not key):
            return Response({'results': []})

        results = []
        script_list = scripts.split(',')
        for sid in script_list:
            if not sid:
                continue
            scripts = Script.objects.filter(id=sid)
            if not len(scripts):
                continue
            current_result = {}
            current_script = scripts[0]
            current_result['script'] = sid
            current_result['test_id'] = current_script.test_id
            current_result['run_id'] = current_script.run_id
            current_result['name'] = current_script.name
            events = UIEvent.objects.filter(testcase_id=current_script.test_id,
                                            run_id=current_script.run_id,
                                            obj_text__icontains=key)
            current_result['events'] = UIEventSerializer(events, many=True).data
            results += [
                current_result,
            ]
        return Response({'results': results})


class SearchInputEvents(APIView):
    """
    Get events by ids.
    """
    @csrf_exempt
    def dispatch(self, *args, **kwargs):
        return super(SearchInputEvents, self).dispatch(*args, **kwargs)

    def post(self, request):
        key = request.data.get('key', '')
        scripts = request.data.get('scripts', '')

        results = []
        script_list = scripts.split(',')
        for sid in script_list:
            if not sid:
                continue
            scripts = Script.objects.filter(id=sid)
            if not len(scripts):
                continue
            current_result = {}
            current_script = scripts[0]
            current_result['script'] = sid
            current_result['test_id'] = current_script.test_id
            current_result['run_id'] = current_script.run_id
            current_result['name'] = current_script.name
            events = UIEvent.objects.filter(testcase_id=current_script.test_id,
                                            run_id=current_script.run_id,
                                            obj_value__icontains=key)

            current_result['events'] = UIEventSerializer(events, many=True).data
            results += [
                current_result,
            ]

        return Response({'results': results})


class SearchAssertEvents(APIView):
    """
    Get events by ids.
    """
    @csrf_exempt
    def dispatch(self, *args, **kwargs):
        return super(SearchAssertEvents, self).dispatch(*args, **kwargs)

    def post(self, request):
        key = request.data.get('key', '')
        scripts = request.data.get('scripts', '')

        results = []
        script_list = scripts.split(',')
        for sid in script_list:
            if not sid:
                continue
            scripts = Script.objects.filter(id=sid)
            if not len(scripts):
                continue
            current_result = {}
            current_script = scripts[0]
            current_result['script'] = sid
            current_result['test_id'] = current_script.test_id
            current_result['run_id'] = current_script.run_id
            current_result['name'] = current_script.name
            events = UIEvent.objects.filter(testcase_id=current_script.test_id,
                                            run_id=current_script.run_id,
                                            action='assert',
                                            obj_assert__icontains=key)

            current_result['events'] = UIEventSerializer(events, many=True).data
            results += [
                current_result,
            ]

        return Response({'results': results})


class SearchSSHEvents(APIView):
    """
    Get events by ids.
    """
    @csrf_exempt
    def dispatch(self, *args, **kwargs):
        return super(SearchSSHEvents, self).dispatch(*args, **kwargs)

    def post(self, request):
        scripts = request.data.get('scripts', [])

        results = []
        for sid in scripts:
            if not sid:
                continue
            obj_scripts = Script.objects.filter(id=sid)
            if not len(obj_scripts):
                continue
            current_result = {}
            current_script = obj_scripts[0]
            current_result['script'] = sid
            current_result['test_id'] = current_script.test_id
            current_result['run_id'] = current_script.run_id
            current_result['name'] = current_script.name
            events = UIEvent.objects.filter(testcase_id=current_script.test_id, run_id=current_script.run_id, action='execute')
            for evt in events:
                if not evt.obj_parent:
                    # recorded before migration
                    evt.obj_id = 'localhost'
                    evt.obj_parent = 'exec-' + str(evt.id)
                    evt.verify_value = 'ls -l'
                    evt.obj_child = 'total'
                    evt.save()

            current_result['events'] = UIEventSerializer(events, many=True).data
            results += [
                current_result,
            ]

        return Response({'results': results})