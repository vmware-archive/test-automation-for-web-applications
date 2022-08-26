# Copyright 2022 VMware, Inc.
# SPDX-License-Identifier: Apache License 2.0
import logging
import mimetypes
import os
import re

import cv2
import requests
import json
import base64

from django.http import StreamingHttpResponse
from wsgiref.util import FileWrapper
from .models import TestCase, Capture, UIEvent
from django.shortcuts import render
from django.views.decorators.csrf import csrf_exempt
from rest_framework.views import APIView
from rest_framework.response import Response
from django.conf import settings
import shutil
from .serializers import CaptureSerializer

logger = logging.getLogger('capture')


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
        if not hasattr(settings, "HTTP_SCREENSHOT_SERVER"):
            return Response(
                {'message': 'HTTP_SCREENSHOT_SERVER not configured.'})
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
                # capture_raw_file_name = capture.consoleid + '@' + current_testcase.uuid + '/' + str(event.id) + '.png'
                # capture_file_name = os.path.join(settings.CONSOLES_ROOT, capture_raw_file_name)
                capture_raw_file_dir = capture.consoleid + '@' + current_testcase.uuid
                capture_raw_file_name = str(event.id) + '.png'
                dir_path = os.path.join(settings.CONSOLES_ROOT,
                                        capture_raw_file_dir)
                capture_file_name = os.path.join(dir_path, capture_raw_file_name)
                is_dir_exist = os.path.exists(dir_path)
                if not is_dir_exist:
                    os.makedirs(dir_path)
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
        capture_events = {}
        for e in events:
            if e.captureid:
                capture_ids += [
                    e.captureid,
                ]
                capture_events[e.captureid] = e.id
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

        capdata = CaptureSerializer(captures, many=True).data
        for c in capdata:
            c['event'] = capture_events.get(c['captureid'], '')
        return render(request, "captures.html", {"captures": captures})


def stream_video(request, testcase_id):
    """
    Respond with video files as streaming media
    """
    try:
        current_testcase = TestCase.objects.get(id=testcase_id)
        capture_raw_file_dir = current_testcase.uuid
        dir_path = os.path.join(settings.VIDEOS_ROOT,
                                capture_raw_file_dir)
        video_path = os.path.join(dir_path, "out.mp4")
    except TestCase.DoesNotExist:
        return StreamingHttpResponse()
    if not os.path.exists(video_path):
        return StreamingHttpResponse()
    range_header = request.META.get('HTTP_RANGE', '').strip()
    range_re = re.compile(r'bytes\s*=\s*(?P<START>\d+)\s*-\s*(?P<END>\d*)',
                          re.I)
    range_match = range_re.match(range_header)
    size = os.path.getsize(video_path)
    content_type, encoding = mimetypes.guess_type(video_path)
    content_type = content_type or 'application/octet-stream'
    if range_match:
        first_byte, last_byte = range_match.group('START'), range_match.group(
            'END')
        first_byte = int(first_byte) if first_byte else 0
        last_byte = first_byte + 1024 * 1024 * 8
        if last_byte >= size:
            last_byte = size - 1
        length = last_byte - first_byte + 1
        resp = StreamingHttpResponse(
            file_iterator(video_path, offset=first_byte, length=length),
            status=206, content_type=content_type)
        resp['Content-Type'] = 'video/mp4'
        resp['Content-Length'] = str(length)
        resp['Content-Range'] = 'bytes %s-%s/%s' % (first_byte, last_byte, size)
    else:
        resp = StreamingHttpResponse(FileWrapper(open(video_path, 'rb')),
                                     content_type=content_type)
        resp['Content-Type'] = 'video/mp4'
        resp['Content-Length'] = str(size)
    resp['Accept-Ranges'] = 'bytes'
    return resp


def file_iterator(file_name, chunk_size=8192, offset=0, length=None):
    with open(file_name, "rb") as f:
        f.seek(offset, os.SEEK_SET)
        remaining = length
        while True:
            if remaining is None:
                bytes_length = chunk_size
            else:
                bytes_length = min(remaining, chunk_size)
            data = f.read(bytes_length)
            if not data:
                break
            if remaining:
                remaining -= len(data)
            yield data


class ShowTestVideo(APIView):
    """
    Show all captures for specific test.
    """
    def get_object(self, testcase_id):
        try:
            return TestCase.objects.get(id=testcase_id)
        except TestCase.DoesNotExist:
            return None

    def get(self, request, testcase_id, runid):
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
        capture_events = {}
        capture_events_dict = {}
        for e in events:
            if e.captureid:
                capture_ids += [
                    e.captureid,
                ]
                capture_events[e.captureid] = e.id
                capture_events_dict[e.captureid] = e
        if not capture_ids:
            return Response({'message': 'No capture found'})

        captures = Capture.objects.filter(captureid__in=capture_ids).order_by('id')
        capture_raw_file_dir = current_testcase.uuid
        dir_path = os.path.join(settings.VIDEOS_ROOT,
                                capture_raw_file_dir)
        if os.path.exists(dir_path):
            shutil.rmtree(dir_path)
        os.makedirs(dir_path)
        cur = 0
        pic_size_dict = {}
        for current_capture in captures:
            cur += 1
            capture_image_name = f'image{cur}.png'
            capture_file_path = os.path.join(dir_path, capture_image_name)
            if current_capture.screenshot.lower().find('.png') > 0:
                image_path = os.path.join(settings.RECORD_SCREENSHOT_ROOT,
                                          current_capture.screenshot)
                if os.path.isfile(image_path):
                    # Copy src to dst. (cp src dst)
                    shutil.copy(image_path, capture_file_path)
            else:
                capture_image = current_capture.content
                i_start = capture_image.find(',')
                imgdata = base64.b64decode(capture_image[i_start + 1:])
                with open(capture_file_path, 'wb') as f_screenshot:
                    f_screenshot.write(imgdata)
                    f_screenshot.close()
            image_fs = cv2.imread(capture_file_path)
            image_info = image_fs.shape
            height = image_info[0]
            width = image_info[1]
            size_key = str(width) + "-" + str(height)
            size_key_value = pic_size_dict.get(size_key)
            if not size_key_value:
                size_key_value = [capture_file_path]
            else:
                size_key_value.append(capture_file_path)
            pic_size_dict.update({size_key: size_key_value})
            if image_fs is None:
                logger.info(str(capture_file_path) + " is error!")
                continue
            capture_event = capture_events_dict.get(current_capture.captureid)
            if not capture_event.obj_top or not capture_event.obj_left or\
                    not capture_event.obj_bottom:
                continue
            left = int(float(capture_event.obj_left))
            top = int(float(capture_event.obj_top))
            right = int(float(capture_event.obj_right))
            bottom = int(float(capture_event.obj_bottom))
            action = capture_event.action
            cv2.rectangle(image_fs, (left, bottom), (right, top), (0, 250, 0),
                          1)
            cv2.putText(image_fs, action, (left, top),
                        cv2.FONT_HERSHEY_COMPLEX_SMALL, 0.8, (0, 255, 0), 1)
            cv2.imwrite(capture_file_path, image_fs)

        max_key = max(pic_size_dict, key=lambda k: len(pic_size_dict[k]))
        width, height = max_key.split("-")
        pic_list = pic_size_dict.get(max_key)
        pic_size = (int(width), int(height))
        pic_list.sort(key=lambda x: int(re.split('image|.png', x)[1]))
        capture_video_path = os.path.join(dir_path, f"{testcase_id}.mp4")
        capture_video = cv2.VideoWriter(capture_video_path,
                                        cv2.VideoWriter_fourcc(*'mp4v'), 1,
                                        pic_size)
        for i in range(len(pic_list)):
            img = cv2.imread(pic_list[i])
            capture_video.write(img)

        capture_video.release()
        cv2.destroyAllWindows()

        os.chdir(dir_path)
        os.system(f"ffmpeg -i {testcase_id}.mp4 -vcodec h264 out.mp4")
        return render(request, "video.html", {"caseid": testcase_id})


class TextResource(APIView):
    """
    Search Text Resource.
    """
    @csrf_exempt
    def dispatch(self, *args, **kwargs):
        return super(TextResource, self).dispatch(*args, **kwargs)

    def post(self, request):
        return Response({
                'message': 'success',
                'textResources': []
        })
