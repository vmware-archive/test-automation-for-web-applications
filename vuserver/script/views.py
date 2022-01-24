# Copyright 2022 VMware, Inc.
# SPDX-License-Identifier: Apache License 2.0

import os
import time
import base64
import requests
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.decorators import api_view
# from channels.asgi import get_channel_layer
from django.http import Http404
from django.views.decorators.csrf import csrf_exempt

from django.conf import settings
from django.http import HttpResponse
from .models import Script
from parallel.models import TestCase, UIEvent
# from parallel.event import adjust_events
from .serializers import *
from parallel.serializers import *
import json
import shutil
import zipfile
import logging
from drf_yasg import openapi
from drf_yasg.utils import swagger_auto_schema
logger = logging.getLogger('script')

SPECIAL_KEYS = ['SHIFT', 'CONTROL', 'ALT']
FUNCTION_KEYS = {'TAB':'TAB','ENTER':'ENTER','BACKSPACE':'BACK_SPACE','DELETE':'DELETE',
                 'INSERT':'INSERT','HOME':'HOME','END':'END','PAGEDOWN':'PAGE_DOWN',
                 'PAGEUP':'PAGE_UP','ESC':'ESC','ARROWLEFT':'ARROW_LEFT',
                 'ARROWLEFT':'ARROW_LEFT','ARROWRIGHT':'ARROW_RIGHT','ARROWUP':'ARROW_UP',
                 'ARROWDOWN':'ARROW_DOWN'}

class Templates(APIView):
    """
    List all templates.
    """
    def get(self, request, **kwargs):
        script_templates = []
        default_template = settings.DEFAULT_TEMPLATE
        files = os.listdir(settings.TEMPLATE_ROOT)
        for f in files:
            f_path = os.path.join(settings.TEMPLATE_ROOT, f)
            if os.path.isdir(f_path) and (f in settings.TEMPLATE_LANGUAGES):
                for t in os.listdir(f_path):
                    t_path = os.path.join(settings.TEMPLATE_ROOT, f, t)
                    if os.path.isdir(t_path):
                        script_templates += [f + '/' + t, ]

        return Response({'message': 'success', 'templates': script_templates, 'default': default_template})


class ScriptDetail(APIView):
    """
    Get script details
    """
    def get_object(self, id):
        try:
            return Script.objects.get(id=id)
        except Script.DoesNotExist:
            return None

    def get(self, request, id, format=None):
        script = self.get_object(id)
        if not script:
            return Response({"message": "Script doesn't exist"})
        logger.debug('Get script details: {0}'.format(id))

        serializer = ScriptSerializer(script)
        return Response({'message': 'success', 'data': serializer.data})


def get_script_ids(newscript):
    if newscript.test_id and newscript.run_id:
        return newscript.test_id, newscript.run_id


def getScriptEvents(testcase, run_id, template=''):
    script_events = []
    uievents = UIEvent.objects.filter(testcase=testcase, run_id=run_id)
    for e in uievents:
        if e.action == 'open':
            actionJson = UIEventOpenSerializer(e, many=False).data
        elif e.action == 'direct':
            actionJson = UIEventDirectSerializer(e, many=False).data
        elif e.action == 'mousedown':
            actionJson = UIEventMousedownSerializer(e, many=False).data
        elif e.action == 'keydown':
            if e.obj_x.upper() in FUNCTION_KEYS:
                e.obj_x = '{'+FUNCTION_KEYS[e.obj_x.upper()]+'}'
            actionJson = UIEventKeydownSerializer(e, many=False).data
        elif e.action == 'keyup' and e.obj_x.upper() in SPECIAL_KEYS:
            if e.obj_x.upper() in FUNCTION_KEYS:
                e.obj_x = '{'+FUNCTION_KEYS[e.obj_x.upper()]+'}'
            actionJson = UIEventKeydownSerializer(e, many=False).data
        elif e.action == 'type':
            actionJson = UIEventTypeSerializer(e, many=False).data
        elif e.action == 'screenshot':
            if e.obj_assert.find('element') > 0:
                actionJson = UIEventElementScreenshotSerializer(e, many=False).data
            else:
                actionJson = UIEventScreenshotSerializer(e, many=False).data
        elif e.action == 'mouseover':
            actionJson = UIEventMouseoverSerializer(e, many=False).data
        elif e.action == 'select' and (e.event in ['20', '2']):
            actionJson = UIEventSelectSerializer(e, many=False).data
        elif e.action == 'assert':
            actionJson = UIEventAssertSerializer(e, many=False).data
        elif e.action == 'execute':
            actionJson = UIEventExecuteSerializer(e, many=False).data
        elif e.action == 'accessibility':
            actionJson = UIEventAccessibilitySerializer(e, many=False).data
        elif e.action == 'browserprompt':
            actionJson = UIEventBrowserpromptSerializer(e, many=False).data
        elif e.action == 'tabswitch':
            actionJson = UIEventTabswitchSerializer(e, many=False).data
        else:
            continue

        # action mapping
        mapped_action = e.action
        if template:
            mapped_action = settings.SCRIPT_TEMPLATES[template]['actions_mappings'].get(e.action, e.action)
        actionJson['action'] = mapped_action
        script_events += [actionJson, ]
    return script_events


def readFile(filename):
    if(not os.path.exists(filename)):
        return ''
    with open(filename,'r+',encoding='utf-8') as f:
        text=f.read()
        f.close()
    return text
def writeFile(filename, txt):
    with open(filename,'w',encoding='utf-8') as f:
        f.write(txt)
        f.close()

def updateNewScriptFile(newscript, template, events_json=[]):
    result = {'newscript': newscript, 'message': 'success'}
    script_date = newscript.createtime.strftime('%Y%m%d')
    script_folder = os.path.join(settings.SCRIPTS_ROOT, script_date, str(newscript.id))
    os.makedirs(script_folder, exist_ok=True)
    template_path = os.path.join(settings.TEMPLATE_ROOT, template)
    # copy template
    if os.path.isdir(script_folder):
        shutil.rmtree(script_folder)
    shutil.copytree(template_path, script_folder)

    # generate package spec
    template_content = readFile(os.path.join(template_path, 'template.spec.js'))
    loadTemplate = "var {0} = require(\"./{0}\");\n"
    setupTemplate = "                loaded_packages.push(await {0}.setup(this.driver, rootConf));\n"
    loadText = ''
    setupText = ''
    teardownText = ''
    for p in settings.SCRIPT_TEMPLATES[template].get('packages', {}):
        package_path = settings.SCRIPT_TEMPLATES[template]['packages'][p]
        target_path = os.path.join(script_folder, 'script', p)
        logger.info('Copy package: {}, {}'.format(package_path, target_path))
        if os.path.isdir(package_path):
            #copy packages
            if os.path.isdir(target_path):
                shutil.rmtree(target_path)
            shutil.copytree(package_path, target_path)
            # generate package loading spec
            loadText += loadTemplate.format(p)
            setupText += setupTemplate.format(p)
            teardownText += '                await {0}.teardown();\n'.format(p)
    script_content = template_content.replace('// LOADING SPEC', loadText)
    script_content = script_content.replace('// SETUP SPEC', setupText)
    script_content = script_content.replace('// TEARDOWN SPEC', teardownText)

    # eventText = ''
    all_events = {"events": []}
    if newscript.test_id > 0:
        real_test_id, real_run_id = get_script_ids(newscript)
        # generate replay spec
        testcases = TestCase.objects.filter(id = real_test_id)
        if not len(testcases):
            msg = 'Error TestCase: test_id/run_id: {0}/{1}'.format(real_test_id, real_run_id)
            result['message'] = msg
            return result
        all_events['events'] = getScriptEvents(testcases[0], real_run_id, template)
            # actionString = json.dumps(actionJson, indent=4).replace('\n', '\n    ')
            # eventText += '    eventData  = ' + actionString + ';\n    replay({0}, "{1}", eventData);\n'.format(e.id, mapped_action)
    elif events_json:
        event_index = 1
        for evt in events_json:
            # action mapping
            evt_action = evt.get('action', '')
            if not evt_action:
                continue
            mapped_action = settings.SCRIPT_TEMPLATES[template]['actions_mappings'].get(evt_action, evt_action)
            evt['action'] = mapped_action
            evt['id'] = event_index
            all_events["events"] += [evt, ]
            # actionString = json.dumps(evt, indent=4).replace('\n', '\n    ')
            # eventText += '    eventData  = ' + actionString + ';\n    replay({0}, "{1}", eventData);\n'.format(evt.get('id', event_index), mapped_action)
            event_index += 1
    # script_content = script_content.replace('// REPLAY SPEC', eventText)
    writeFile(os.path.join(script_folder, 'script', 'test.spec.js'), script_content)
    newscript.path = script_date + "/" + str(newscript.id)
    newscript.save()

    actionsString = json.dumps(all_events, indent=4).replace('\n', '\n    ')
    writeFile(os.path.join(script_folder, 'script', 'test.events.json'), actionsString)
    result['newscript'] = newscript
    return result

class GenerateScript(APIView):
    """
    Generate script
    """
    def get_testcase(self, id):
        try:
            return TestCase.objects.get(id=id)
        except TestCase.DoesNotExist:
            return None

    def post(self, request, **kwargs):
        template = request.data.get('script_template', settings.DEFAULT_TEMPLATE) # *
        if template and (template in settings.SCRIPT_TEMPLATES):
            # generate new script
            script_test_id = request.data.get('test_id', 0)
            script_run_id = request.data.get('run_id', 0)
            events_string = request.data.get('events', '')
            script_user = request.data.get('user', '')
            script_product = request.data.get('product', '')
            script_name = request.data.get('name', '')

            script_events = []
            current_testcase = self.get_testcase(script_test_id)
            if events_string:
                try:
                    script_events = json.loads(events_string)
                    if (not isinstance (script_events, list)):
                        return Response({'message': 'Failed: script_events is not list.'})
                except Exception:
                    return Response({'message': 'Failed: events_string is not valid.'})
            elif current_testcase:
                script_user = current_testcase.user
                script_name = current_testcase.name
                script_product = current_testcase.product.name
            else:
                return Response({'message': 'Failed: bad parameter.'})

            newscript = Script.objects.create(
                test_id = int(script_test_id),
                run_id = int(script_run_id),
                user = script_user,
                product = script_product,
                name = script_name,
                description = "",
                template = template,
                events = events_string
            )
            result = updateNewScriptFile(newscript, template, script_events)
            if result['message'] != 'success':
                return Response({'message': result['message']})

            serializer = ScriptSerializer(newscript)
            return Response({'message': 'success', 'data': serializer.data})
        else:
            return Response({'message': 'Bad template: ' + template})


class Download(APIView):
    """
    Download script.
    """
    def get_object(self, id):
        try:
            return Script.objects.get(id=id)
        except Script.DoesNotExist:
            return None

    def zip_folder(self, dir_name, zip_file_name):
        file_list = []
        if os.path.isfile(dir_name):
            file_list.append(dir_name)
        else:
            for root, dirs, files in os.walk(dir_name):
                for name in files:
                    file_list.append(os.path.join(root, name))

        zf = zipfile.ZipFile(zip_file_name, "w", zipfile.zlib.DEFLATED)
        for tar in file_list:
            arc_name = tar[len(dir_name):]
            zf.write(tar, arc_name)
        zf.close()

    def get(self, request, id, format=None):
        script = self.get_object(id)
        if not script:
            return Response({"message": "Script doesn't exist"})

        script_date = script.createtime.strftime('%Y%m%d')
        current_date = time.strftime('%Y%m%d')
        script_folder = os.path.join(settings.SCRIPTS_ROOT, script_date, str(script.id))
        zipfile_name = os.path.join(settings.DOWNLOADS_ROOT, '{}-script-{}.zip'.format(current_date, id))
        self.zip_folder(script_folder, zipfile_name)
        response = HttpResponse(open(zipfile_name, 'rb'))
        response['Content-Type'] = 'application/octet-stream'
        response['Content-Disposition'] = 'attachment;filename="{}-script-{}.zip"'.format(current_date, id)
        return response


# class ScriptSteps(APIView):
#     """
#     Get script steps
#     """
#     def post(self, request, **kwargs):
#         script_ids = request.data.get('ids', [])
#         script_step_list = []
#         for sid in script_ids:
#             found = None
#             try:
#                 found = Script.objects.get(id=int(sid))
#             except Exception:
#                 pass
#             if found:
#                 script_info = {"script_id": str(found.id), "script_steps": []}
#                 # get real test_id/run_id from description
#                 real_test_id, real_run_id = get_script_ids(found)
#                 # generate replay spec
#                 testcases = TestCase.objects.filter(id = real_test_id)
#                 if not len(testcases):
#                     msg = 'Error TestCase: test_id/run_id: {0}/{1}'.format(real_test_id, real_run_id)
#                     return Response({'message': msg})
#                 uievents = UIEvent.objects.filter(testcase=testcases[0], run_id=real_run_id)
#                 for evt in uievents:
#                     if not evt.event:
#                         continue
#                     event_type = int(str(evt.event))
#                     if(event_type == 2):# onchange
#                         script_info["script_steps"] += ["input '{0}' for {1}\n".format(evt.obj_value, evt.obj_id), ]
#                     elif(event_type == 20):# click
#                         obj_label=''
#                         if evt.obj_text:
#                             obj_label =  evt.obj_text
#                         elif evt.obj_value:
#                             obj_label =  evt.obj_value
#                         elif evt.obj_id:
#                             obj_label =  evt.obj_id
#                         elif evt.obj_class:
#                             obj_label =  evt.obj_class
#                         obj_label = obj_label.replace('\n',' ')
#                         if (len(obj_label)>32):
#                             obj_label = obj_label[:30] + ' ...'
#                         if (len(obj_label)>0):
#                             script_info["script_steps"] += ["click '{0}'\n".format(obj_label), ]
#                 script_step_list += [script_info, ]

#         return Response({'message':'success','script_step_list': script_step_list})


# class ScriptsByIds(APIView):
#     """
#     Get scripts by ids
#     """
#     def post(self, request, **kwargs):
#         ids = request.data.get('ids', [])
#         scripts = Script.objects.filter(id__in=ids)
#         serializer = ScriptSerializer(scripts, many=True)
#         return Response({'message': 'success', 'scripts': serializer.data})


# class ScriptEvents(APIView):
#     """
#     Get script events
#     """
#     def post(self, request, **kwargs):
#         ids = request.data.get('ids', [])
#         scripts = Script.objects.filter(id__in=ids)
#         final_result = {}
#         for s in scripts:
#             testcases = TestCase.objects.filter(id = s.test_id)
#             if not len(testcases):
#                 continue
#                 # return Response({'message': 'Error TestCase', 'script_id': s.id, 'test_id': s.test_id})
#             current_testcase = testcases[0]

#             if s.run_id == 0:
#                 refer_info = {}
#                 r_start = s.description.find('[ScriptReferredDoNotRemoveStart]')
#                 if r_start > 0:
#                     m = s.description[r_start:].find('{')
#                     n = s.description[r_start:].find('}')
#                     try:
#                         refer_info = json.loads(s.description[r_start+m:r_start+n+1])
#                     except Exception:
#                         pass
#                 parent_test_id = refer_info.get('script_test_id_referred', 0)
#                 parent_run_id = refer_info.get('script_run_id_referred', 0)

#                 if parent_test_id and parent_run_id:
#                     # get events from parent test case
#                     testcases = TestCase.objects.filter(id=parent_test_id)
#                     if not len(testcases):
#                         logger.info('Cloned test, parent not found.')
#                         continue
#                     parent_testcase = testcases[0]
#                     parent_events = UIEvent.objects.filter(testcase=parent_testcase, run_id=parent_run_id)
#                     logger.info('parent_events: {}, {}, {}'.format(s.id, refer_info, len(parent_events)))

#                     # clone events
#                     for pe in parent_events:
#                         pe.pk = None
#                         pe.testcase = current_testcase
#                         pe.save()
#                     s.run_id = parent_run_id
#                     s.save()

#             configure_events = ["1", "9", "19", "2", "26", "24", "27"]
#             events = UIEvent.objects.filter(testcase=current_testcase, run_id=s.run_id).order_by('recordtime')
#             exclude_ids, capture_ids, last_event = adjust_events(events)
#             events = UIEvent.objects.filter(testcase=current_testcase, event__in=configure_events, run_id=s.run_id).order_by('recordtime').exclude(id__in = exclude_ids)
#             final_result[s.id] = {}
#             for e in events:
#                 final_result[s.id][e.id] = UIEventConfigSerializer(e, many=False).data

#         return Response({'message': 'success', 'events': final_result})
