# Copyright 2022 VMware, Inc.
# SPDX-License-Identifier: Apache License 2.0

import os
import requests
import json
import base64

from .models import TestCase, Capture, UIEvent
from django.shortcuts import render
from django.views.decorators.csrf import csrf_exempt

from rest_framework.views import APIView
from rest_framework.response import Response
from django.conf import settings


class CaptureSaver(APIView):
    """
    Save capture to database.
    """
    @csrf_exempt
    def dispatch(self, *args, **kwargs):
        return super(CaptureSaver, self).dispatch(*args, **kwargs)

    def post(self, request):
        captureid = request.data.get('captureid', '')
        consoleid = request.data.get('consoleid', '')
        content = request.data.get('img', '')
        if (not captureid) or (not content):
            return Response({'message': 'not valid'})
        else:
            current_capture = Capture(captureid=captureid, consoleid=consoleid, content=content)
            current_capture.save()
            return Response({'message': 'success', 'captureid': captureid})


class AutoCaptureUpload(APIView):
    """
    Upload capture to screenshot server.
    if test_id is set:
        post test data to screenshot server.
    else:
        Post one capture for each call.
    """
    @csrf_exempt
    def dispatch(self, *args, **kwargs):
        return super(AutoCaptureUpload, self).dispatch(*args, **kwargs)

    def post(self, request):
        if not settings.HTTP_SCREENSHOT_SERVER:
            return Response({'message': 'HTTP_SCREENSHOT_SERVER not configured.'})
        current_testcase = None
        capture = None
        event = None
        test_id = request.data.get('test_id', '')
        if test_id:
            # update screenshot products
            try:
                current_testcase = TestCase.objects.get(id=int(test_id))
            except Exception:
                pass
        else:
            # upload capture
            capture = Capture.objects.filter(screenshot='', content__startswith='data').order_by('-id').first()
            if not capture:
                capture = Capture.objects.filter(screenshot__contains='-999',
                                                 content__startswith='data').order_by('-id').first()
            if capture:
                try:
                    event = UIEvent.objects.get(captureid=capture.captureid)
                except Exception:
                    if capture.screenshot.find('-999') >= 0:
                        capture.delete()
                        return Response({'message': 'success', 'marked': capture.captureid})
                    else:
                        capture.screenshot = 'Error-999'
                        capture.save()
                        return Response({'message': 'success', 'deleted': capture.captureid})
                current_testcase = event.testcase

        if not current_testcase:
            return Response({'message': 'success', 'text': 'Current testcase is not valid.'})

        screenshot_locales = [current_testcase.leader_locale]
        if screenshot_locales:
            screenshot_locales = screenshot_locales + current_testcase.user_locales
        screenshot_locales = list(set(screenshot_locales))
        refresh_props = {
            'product': {
                'id': str(current_testcase.product.id),
                'name': current_testcase.product.name,
                'bu_name': current_testcase.product.bu_name,
                'reported_issue_target': current_testcase.product.reported_issue_target,
                'bug_product_name': current_testcase.product.bug_product_name,
            },
            'test': {
                'id': str(current_testcase.id),
                'user': current_testcase.user,
                'product_id': str(current_testcase.product.id),
                'name': current_testcase.name,
                'build_no': current_testcase.build_no,
                'locales': screenshot_locales,
                'apptype': current_testcase.apptype,
                'testbed': current_testcase.testbed,
                'browser': current_testcase.browser,
                'resolution': current_testcase.resolution,
            }
        }
        headers = {'Content-type': 'application/json'}
        # refresh test case
        refresh_url = '{}/screenshot/create_screenshot_product_test/'.format(settings.HTTP_SCREENSHOT_SERVER)
        response = requests.post(refresh_url, data=json.dumps(refresh_props), headers=headers, timeout=5)
        if response.status_code != 201 and response.status_code != 200:
            return Response({'message': 'Cannot refresh product.', 'text': response.text})
        if (not capture) or (not event):
            # update screenshot products done
            return Response({'message': 'success', 'text': response.text})
        else:
            screenshot_name = str(event.id) + ':[record]'
            if event.event == '18' and len(event.obj_text) > 0:
                screenshot_name = event.obj_text
            screenshot_url = '{}/screenshot/take_screenshot/'.format(settings.HTTP_SCREENSHOT_SERVER)
            # upload capture
            screenshot_props = {
                "test_id": event.testcase.id,
                "run_id": event.testcase.run_id,
                "event_id": event.id,
                "locale": current_testcase.leader_locale,
                "name": screenshot_name.replace('/', '\\'),
                "img": capture.content,
                "client": "",
                "event": "18",
                "content": ""
            }
            headers = {'Content-type': 'application/json'}
            screenshot_data = {}
            try:
                response = requests.post(screenshot_url, data=json.dumps(screenshot_props), headers=headers, timeout=30)
                screenshot_data = json.loads(response.text)
            except Exception:
                return Response({'message': 'Screenshot service not available.'})
            screenshot_raw_file_name = screenshot_data.get('screenshot_raw_file_name', '')
            if not screenshot_raw_file_name:
                capture.screenshot = response.text[:255]
                capture.save()
                return Response({'message': 'Screenshot response wrong.'})

            capture_raw_file_name = ''
            if capture.consoleid != '' and capture.capture == '':
                capture_raw_file_name = capture.consoleid + '@' + current_testcase.uuid + '/' + str(event.id) + '.png'
                capture_file_name = os.path.join(settings.PARALLEL_ROOT, capture_raw_file_name)
                capture_image = capture.content
                iStart = capture_image.find(',')
                imgdata = base64.b64decode(capture_image[iStart + 1:])
                with open(capture_file_name, 'wb') as f_screenshot:
                    f_screenshot.write(imgdata)
                    f_screenshot.close()

            # update capture with screenshot path
            capture.screenshot = screenshot_raw_file_name
            capture.capture = capture_raw_file_name
            capture.content = ''
            capture.save()

            return Response({
                'message': 'success',
                "test_id": event.testcase.id,
                "run_id": event.testcase.run_id,
                "event_id": event.id,
                "name": 'record-' + str(event.id),
                "captureid": capture.content,
                "screenshot": screenshot_raw_file_name,
                "capture": capture_raw_file_name,
                "r.time": response.elapsed.microseconds
            })


class EventCapture(APIView):
    """
    Get capture file for specific event id.
    """
    def get_object(self, id):
        try:
            return UIEvent.objects.get(id=id)
        except UIEvent.DoesNotExist:
            return None

    def get(self, request, event_id, format=None):
        current_event = self.get_object(event_id)
        if not current_event:
            return Response({'message': 'Event id does not exist'})

        current_capture = None
        try:
            current_capture = Capture.objects.get(captureid=current_event.captureid)
        except Capture.DoesNotExist:
            return Response({'message': 'Cannot find capture for current event'})

        if current_capture.screenshot.lower().find('.png') <= 0:
            return Response({'message': 'Capture is not stored in file system'})

        image_path = os.path.join(settings.RECORD_SCREENSHOT_ROOT, current_capture.screenshot)
        if not os.path.isfile(image_path):
            return Response({'message': 'Capture file not exist.'})

        image_data = ''
        with open(image_path, 'rb') as f:
            image_binary_data = f.read()
            image_data = 'data:image/png;base64,' + str(base64.b64encode(image_binary_data))[2:-1]
        return Response({'message': 'success', 'image': image_data})


class ShowCapture(APIView):
    """
    Show one capture file.
    """
    def get(self, request, capture_uuid, format=None):
        captures = Capture.objects.filter(captureid=capture_uuid)
        if not len(captures):
            return Response({'message': 'Capture not found'})

        current_capture = captures[0]
        if current_capture.screenshot.lower().find('.png') > 0:
            image_path = os.path.join(settings.RECORD_SCREENSHOT_ROOT, current_capture.screenshot)
            if os.path.isfile(image_path):
                with open(image_path, 'rb') as f:
                    image_binary_data = f.read()
                    current_capture.content = 'data:image/png;base64,' + str(base64.b64encode(image_binary_data))[2:-1]
        return render(request, "capture.html", {"capture": current_capture})


class ShowTestCaptures(APIView):
    """
    Show all captures for specific test.
    """
    def get_object(self, id):
        try:
            return TestCase.objects.get(id=id)
        except TestCase.DoesNotExist:
            return None

    def get(self, request, testcase_id, runid, format=None):
        current_testcase = self.get_object(testcase_id)
        if not current_testcase:
            return Response({'message': 'TestCase not exist.'})

        if runid == '0' or runid == 0:
            # VIU-3409: get earliest runid
            all_events = UIEvent.objects.filter(testcase=current_testcase).order_by('run_id')
            if not all_events:
                return Response({'message': 'No capture found'})
            runid = all_events[0].run_id

        capture_ids = []
        events = UIEvent.objects.filter(testcase=current_testcase, run_id=runid).order_by('recordtime')
        for e in events:
            if e.captureid:
                capture_ids += [
                    e.captureid,
                ]

        if not capture_ids:
            return Response({'message': 'No capture found'})
        captures = Capture.objects.filter(captureid__in=capture_ids).order_by('id')
        for current_capture in captures:
            if current_capture.screenshot.lower().find('.png') > 0:
                image_path = os.path.join(settings.RECORD_SCREENSHOT_ROOT, current_capture.screenshot)
                if os.path.isfile(image_path):
                    with open(image_path, 'rb') as f:
                        image_binary_data = f.read()
                        current_capture.content = 'data:image/png;base64,' + str(base64.b64encode(image_binary_data))[2:-1]
        return render(request, "captures.html", {"captures": captures})