# Copyright 2022 VMware, Inc.
# SPDX-License-Identifier: Apache License 2.0

import os
import time
import requests
import json
import re
from datetime import datetime, timezone, timedelta
import base64

from .models import Product, TestCase, Client, Capture, UIEvent, Console
from script.models import Script
from script.views import updateNewScriptFile, getScriptEvents
from .serializers import ProductSerializer, TestCaseSerializer, ClientSerializer, CaptureSerializer
from .serializers import UIEventSerializer, UIEventConfigSerializer, SimpleConsoleSerializer
from script.serializers import ScriptSerializer

from django.http import Http404
from django.shortcuts import render
from django.contrib.auth.decorators import login_required
from django.db.models import Q, F, Count
from django.db import transaction
from django.contrib.auth.models import User
from django.views.decorators.csrf import csrf_exempt

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.decorators import api_view
from django.conf import settings
from .consumers import send_ws_message, send_ws_status
from rest_framework.pagination import PageNumberPagination
from container_pool.deploy import startConsoles, stopConsoles
import logging
from drf_yasg.utils import swagger_auto_schema

logger = logging.getLogger('parallel')


class MyPageNumberPagination(PageNumberPagination):
    page_size = 200
    page_size_query_param = "size"
    max_page_size = 2000
    page_query_param = "page"


class Products(APIView):
    """
    List all products.
    """
    def get(self, request, **kwargs):
        # initial product/user
        products = Product.objects.filter(name='TAWA', softdeleted=False)
        if not len(products):
            p = Product.objects.create(
                name='TAWA',
                bu_name='TAWA',
                reported_issue_target='jira',
                bug_product_name='TAWA',
            )
        users = User.objects.filter(username='tawa')
        if not len(users):
            u = User.objects.create_user('tawa', 'tawa' + "@tawa.com", 'v')
            u.is_staff = True
            u.last_login = datetime.now()
            u.first_name = 'tawa'
            u.save()

        products = Product.objects.filter(softdeleted=False)
        if not len(products):
            return Response({'message': 'No product'})

        products_serializer = ProductSerializer(products, many=True)
        return Response({'message': 'success', 'products': products_serializer.data})

    def post(self, request, **kwargs):
        name = request.data.get('name', '')  # *
        bu_name = request.data.get('bu_name', '')  # *
        reported_issue_target = request.data.get('reported_issue_target', 'bugzilla')  # *
        bug_product_name = request.data.get('bug_product_name', '')  # *
        if (not name) or (not bu_name) or (not bug_product_name):
            return Response({'message': 'Bad parameters'})

        # check the products
        products = Product.objects.filter(name=name)
        if len(products):
            p = products[0]
            p.bu_name = bu_name
            p.reported_issue_target = reported_issue_target
            p.bug_product_name = bug_product_name
            p.save()
        else:
            p = Product.objects.create(
                name=name,
                bu_name=bu_name,
                reported_issue_target=reported_issue_target,
                bug_product_name=bug_product_name,
            )

        products_serializer = ProductSerializer(p)
        return Response({'message': 'success', 'products': products_serializer.data})


class Locales(APIView):
    """
    List all locales.
    """
    def get(self, request, **kwargs):
        return Response({'message': 'success', 'locales': set(settings.LOCALE_MAP.values())})


class Resolutions(APIView):
    """
    List all resolutions.
    """
    def get(self, request, **kwargs):
        return Response({'message': 'success', 'resolutions': settings.RESOLUTIONS})


class Connect(APIView):
    swagger_schema = None
    """
    Connect to record server.
    """
    @csrf_exempt
    def dispatch(self, *args, **kwargs):
        return super(Connect, self).dispatch(*args, **kwargs)

    def post(self, request):
        client_uuid = request.data.get('uuid', '')
        role = request.data.get('role', '')
        locale = request.data.get('locale', '')
        testcase_uuid = request.data.get('testcase', '')

        testcases = TestCase.objects.filter(uuid=testcase_uuid)
        if not len(testcases):
            return Response({'message': 'Cannot find testcase ' + testcase_uuid})

        current_client = Client(uuid=client_uuid,
                                role=role,
                                locale=settings.LOCALE_MAP.get(locale, 'en'),
                                testcase=testcases[0])
        current_client.save()
        client_serializer = ClientSerializer(current_client)

        current_testcase = testcases[0]
        if role == 'worker':
            for lc in eval(current_testcase.locales):
                i = lc.find('@')
                if i > 0:
                    if lc[:i] == current_client.locale:
                        current_testcase.start_url = lc[i + 1:]

        testcase_serializer = TestCaseSerializer(current_testcase)
        accessbility_server = ''
        if hasattr(settings, 'HTTP_ACCESSIBILITY_SERVER'):
            accessbility_server = settings.HTTP_ACCESSIBILITY_SERVER
        return Response({
            'message': 'success',
            'testcase': testcase_serializer.data,
            'client': client_serializer.data,
            'client_uuid': client_uuid,
            'product': current_testcase.product.name,
            'otherServers': {
                'accessibility': accessbility_server,
                'websocket': settings.WEBSOCKET_SERVER
            }
        })


class Record(APIView):
    swagger_schema = None
    """
    Record event from leader client.
    Send ws message to worker clients.
    """
    @csrf_exempt
    def dispatch(self, *args, **kwargs):
        return super(Record, self).dispatch(*args, **kwargs)

    def post(self, request):
        responseMessages = []
        requestData = request.data
        if type(requestData) is not list:
            requestData = [requestData]
        for recordEntry in requestData:
            client_uuid = recordEntry.get('client', '')
            clients = Client.objects.filter(uuid=client_uuid)
            if not len(clients):
                responseMessages.append({'message': 'Invalid client uuid'})
            current_testcase = clients[0].testcase
            try:
                # update current_testcase due to there might be cache
                # clients[0].testcase may not been updated in time if cache exists
                current_testcase = TestCase.objects.get(uuid=clients[0].testcase.uuid)
            except TestCase.DoesNotExist:
                responseMessages.append({'message': 'TestCase not found'})

            if current_testcase.status == "running":
                serializer = UIEventSerializer(data=recordEntry)
                if serializer.is_valid():
                    action = serializer.validated_data.get('action', '')
                    event = serializer.validated_data.get('event', '')
                    temp_xpath2 = serializer.validated_data.get('obj_xpath2', '')
                    obj_text = serializer.validated_data.get('obj_text', '')
                    if action == '':
                        if event == '19':
                            action = 'mousedown'
                            # VIU-3559
                            if temp_xpath2.find('SELECT[') > 0 and len(obj_text.split(';')) == 3:
                                action = 'select'
                        elif event == '20':
                            action = 'mouseup'
                            # VIU-3559
                            if temp_xpath2.find('SELECT[') > 0 and len(obj_text.split(';')) == 3:
                                action = 'select'
                        elif event == '9':
                            action = 'keydown'
                        elif event == '10':
                            action = 'keyup'
                        elif event == '11':
                            action = 'input'
                        elif event == '29':
                            action = 'browserprompt'
                        elif event == '2':
                            action = 'type'
                            if temp_xpath2.find('SELECT[') > 0:
                                action = 'select'
                        elif event == '24':
                            action = 'mouseover'
                        elif event == '1':
                            action = 'click'
                            if temp_xpath2.find('SELECT[') > 0:
                                action = 'select'
                                event = '20'
                        elif event == '33':
                            action = 'tabswitch'
                    elif action == 'screenshot':
                        serializer.validated_data['platform'] = ''
                        if hasattr(settings, 'SCREENSHOT_SERVER'):
                            if settings.SCREENSHOT_SERVER:
                                serializer.validated_data['platform'] = settings.SCREENSHOT_SERVER
                    elif action == 'report_issue':
                        serializer.validated_data['platform'] = ''
                        if hasattr(settings, 'REPORTISSUE_SERVER'):
                            if settings.REPORTISSUE_SERVER:
                                serializer.validated_data['platform'] = settings.REPORTISSUE_SERVER

                    serializer.validated_data['event'] = event
                    serializer.validated_data['action'] = action
                    serializer.validated_data['testcase'] = current_testcase
                    serializer.validated_data['run_id'] = current_testcase.run_id
                    temp_obj_id = serializer.validated_data.get('obj_id', '')
                    if len(temp_obj_id) > 0:
                        if temp_obj_id[0] != '#':
                            # VIU-963
                            serializer.validated_data['obj_id'] = '#' + temp_obj_id
                    new_event = None
                    #if action != 'mouseover':
                    # save except mouseover
                    new_event = serializer.save()
                    # mouseover_tests = ['bd60b266-6430-495f-97f1-fd4d94b5cb05', ]
                    # if current_testcase.uuid in mouseover_tests and action == 'mouseover' and \
                    # if action == 'mouseover' and \
                    #    serializer.validated_data.get('obj_xpath2', '').find('NSX-DFW-RULE-ELEMENT') > 0:
                    #     serializer.save()

                    glossary = ''
                    if action == 'unlocal_check':
                        # send glossary
                        glossary = current_testcase.glossary

                    send_ws_message(current_testcase.product.name, current_testcase.uuid,
                                    current_testcase.name, current_testcase.start_url, serializer.data, client_uuid,
                                    recordEntry.get('sn', 0), glossary)

                    # get report issue id and send to live console
                    if action == 'report_issue' and hasattr(settings.REPORTISSUE_SERVER):
                        if settings.REPORTISSUE_SERVER:
                            reportissue_url = '{}/reportedissue/get_reported_issue_id/'.format(settings.REPORTISSUE_SERVER)
                            reportissue_props = {
                                "reported_issue_utility_name": "storage",
                                "reported_issue_test_id": str(current_testcase.id),
                                "reported_issue_exec_id": str(current_testcase.run_id),
                                "reported_issue_screenshot_id": str(new_event.id),
                                "reported_issue_locales": current_testcase.user_locales,
                            }

                            headers = {'Content-type': 'application/json'}
                            response = requests.post(reportissue_url,
                                                     data=json.dumps(reportissue_props),
                                                     headers=headers,
                                                     timeout=5)
                            if response.status_code == requests.codes.ok:
                                reported_issue_id = response.json().get('reported_issue_id', '')
                                logger.debug('Got reported_issue_id: {0}'.format(reported_issue_id))
                                if reported_issue_id:
                                    send_ws_status(current_testcase.uuid, 'leader', 'en_US', 'report_issue', reported_issue_id)

                    responseMessages.append({'message': 'success'})
                else:
                    logger.debug('serializer.errors: {0}'.format(serializer.errors))
                    responseMessages.append({'message': 'not valid'})
            else:
                responseMessages.append({'message': 'TestCase is not running, discard this event'})
        # end for
        return Response(responseMessages)


class ClientStatus(APIView):
    swagger_schema = None
    """
    Post client status.
    """
    @csrf_exempt
    def dispatch(self, *args, **kwargs):
        return super(ClientStatus, self).dispatch(*args, **kwargs)

    def post(self, request):
        client_uuid = request.data.get('client', '')
        eventid = request.data.get('eventid', '')
        clientstatus = request.data.get('status', '')
        message = request.data.get('message', '')
        event_action = request.data.get('event_action', '')
        if (not client_uuid) or (not clientstatus):
            return Response({'message': 'not valid'})
        else:
            clients = Client.objects.filter(uuid=client_uuid)
            if not len(clients):
                return Response({'message': 'Invalid client uuid'})
            current_client = clients[0]
            client_data = {'eventid': eventid, 'status': clientstatus, 'message': message}
            if clientstatus == 'sendverify' and eventid != '':
                events = UIEvent.objects.filter(id=int(eventid))
                if len(events):
                    if event_action:
                        events[0].action = event_action
                    events[0].verify_type = 'sendverify'
                    events[0].verify_value = message
                    events[0].save()
                return Response({'message': 'success'})
            send_ws_status(current_client.testcase.uuid, current_client.role, current_client.locale, '', client_data)
            return Response({'message': 'success'})


class ShowTestcase(APIView):
    swagger_schema = None
    """
    Show testcase details.
    """
    def get_object(self, id):
        try:
            return TestCase.objects.get(uuid=id)
        except TestCase.DoesNotExist:
            return None

    def get(self, request, testcase_uuid, format=None):
        current_testcase = self.get_object(testcase_uuid)
        if not current_testcase:
            return Response({'message': 'TestCase not found'})

        worker_consoles = []
        leader_consoles = []
        if current_testcase.status == 'running':
            consoles = Console.objects.filter(appuuid=testcase_uuid, status='running')
            for c in consoles:
                if c.role == 'leader':
                    leader_consoles += [
                        c,
                    ]
                else:
                    worker_consoles += [
                        c,
                    ]

        if current_testcase.start_url == "":
            return render(request, "autocap.html", {
                "testcase": current_testcase,
                "worker_consoles": worker_consoles,
                "leader_consoles": leader_consoles
            })

        filebug_url = ''
        if hasattr(settings, 'FILEBUG_SERVER'):
            filebug_url = settings.FILEBUG_SERVER
        if current_testcase.apptype == "automation":
            return render(
                request, "testcase2.html", {
                    "filebug_url": filebug_url,
                    "testcase": current_testcase,
                    "worker_consoles": worker_consoles,
                    "leader_consoles": leader_consoles
                })
        else:
            return render(
                request, "testcase.html", {
                    "filebug_url": filebug_url,
                    "testcase": current_testcase,
                    "worker_consoles": worker_consoles,
                    "leader_consoles": leader_consoles
                })


@swagger_auto_schema(method='GET', auto_schema=None)
@api_view(['GET'])
def show_xy(request):
    return render(request, "xy.html")


@swagger_auto_schema(method='GET', auto_schema=None)
@api_view(['GET'])
def show_bp(request):
    return render(request, "browserprompt.html")


class SearchTests(APIView):
    swagger_schema = None
    """
    Search tests by ids, uuids or user name.
    """
    @csrf_exempt
    def dispatch(self, *args, **kwargs):
        return super(SearchTests, self).dispatch(*args, **kwargs)

    def post(self, request):
        ids = request.data.get('ids', [])
        uuids = request.data.get('uuids', [])
        user = request.data.get('user', '')

        testcases = []
        if len(user) > 0:
            testcases = TestCase.objects.filter(softdeleted=False, user=user).order_by('-id')
        elif len(ids) > 0:
            testcases = TestCase.objects.filter(softdeleted=False, id__in=ids).order_by('-id')
        elif len(uuids) > 0:
            testcases = TestCase.objects.filter(softdeleted=False, uuid__in=uuids).order_by('-id')

        pg = MyPageNumberPagination()
        page_testcases = pg.paginate_queryset(queryset=testcases, request=request, view=self)
        testcase_serializer = TestCaseSerializer(page_testcases, many=True)
        return Response({'message': 'success', 'testcases': testcase_serializer.data})


class UserTests(APIView):
    """
    Get tests from one user.
    """
    def get(self, request, username, format=None):
        testcases = TestCase.objects.filter(user=username, softdeleted=False).order_by('-id')
        if not len(testcases):
            return Response({'message': 'No TestCase'})

        pg = MyPageNumberPagination()
        page_testcases = pg.paginate_queryset(queryset=testcases, request=request, view=self)
        testcase_serializer = TestCaseSerializer(page_testcases, many=True)
        return Response({'message': 'success', 'testcases': testcase_serializer.data})


class TestReport(APIView):
    """
    Get test report.
    """
    def get(self, request, testcase_uuid, format=None):
        tests = None
        try:
            tests = TestCase.objects.filter(uuid=testcase_uuid)
            if not len(tests):
                tests = TestCase.objects.filter(id=int(testcase_uuid))
        except Exception:
            pass

        if not tests:
            return Response({'message': 'Error TestCase'})
        if not len(tests):
            return Response({'message': 'Error TestCase'})

        current_testcase = tests[0]
        testcase_serializer = TestCaseSerializer(current_testcase)
        testruns = UIEvent.objects.filter(testcase=current_testcase).values_list('run_id').distinct().order_by('-run_id')
        test_reports = {}
        for rid in [v[0] for v in testruns]:
            if rid not in test_reports:
                test_reports[rid] = {"record_time": "", "script": "", "events": "", "captures": ""}
            scripts = Script.objects.filter(test_id=current_testcase.id, run_id=rid)
            if len(scripts):
                test_reports[rid]['script'] = 'http://{}/script/download/{}'.format(settings.PARALLEL_SERVER, scripts[0].id)
            test_reports[rid]['events'] = 'http://{}/parallel/scriptevents/{}/{}'.format(settings.PARALLEL_SERVER,
                                                                                     current_testcase.id, rid)
            test_reports[rid]['captures'] = 'http://{}/parallel/captures/{}/{}'.format(settings.PARALLEL_SERVER,
                                                                                       current_testcase.id, rid)
            events = UIEvent.objects.filter(testcase=current_testcase, run_id=rid).order_by('recordtime')
            if len(events):
                test_reports[rid]['record_time'] = events[0].recordtime.strftime("%Y-%m-%d %H:%M:%S")

        return Response({'message': 'success', 'testcase': testcase_serializer.data, 'testruns': test_reports})


class TestManager(APIView):
    """
    Test operations.
    """
    @csrf_exempt
    def dispatch(self, *args, **kwargs):
        return super(TestManager, self).dispatch(*args, **kwargs)

    def get(self, request, testcase_uuid, format=None):
        if not testcase_uuid:
            # all tests
            tests = TestCase.objects.filter(softdeleted=False).order_by('-id')
            if not len(tests):
                return Response({'message': 'No tests'})
            pg = MyPageNumberPagination()
            page_testcases = pg.paginate_queryset(queryset=tests, request=request, view=self)
            testcase_serializer = TestCaseSerializer(page_testcases, many=True)
            return Response({'message': 'success', 'tests': testcase_serializer.data})
        elif not testcase_uuid.isdigit() and len(testcase_uuid) != 36:
            # by apptype
            tests = TestCase.objects.filter(apptype=testcase_uuid, softdeleted=False).order_by('-id')
            if not len(tests):
                return Response({'message': 'success', 'tests': []})
            else:
                pg = MyPageNumberPagination()
                page_testcases = pg.paginate_queryset(queryset=tests, request=request, view=self)
                testcase_serializer = TestCaseSerializer(page_testcases, many=True)
                return Response({'message': 'success', 'tests': testcase_serializer.data})
        # test details
        tests = []
        try:
            tests = TestCase.objects.filter(uuid=testcase_uuid)
            if not len(tests):
                tests = TestCase.objects.filter(id=int(testcase_uuid))
        except Exception:
            pass

        if not len(tests):
            return Response({'message': 'Testcase not found.'})

        current_testcase = TestCase.objects.get(uuid=tests[0].uuid)
        testcase_serializer = TestCaseSerializer(current_testcase)
        testruns = UIEvent.objects.filter(testcase=current_testcase).values_list('run_id').distinct().order_by('-run_id')

        consoles_data = []
        if current_testcase.status == 'running':
            running_consoles = Console.objects.filter(appuuid=current_testcase.uuid, status='running')
            console_serializer = SimpleConsoleSerializer(running_consoles, many=True)
            consoles_data = console_serializer.data
        return Response({'message': 'success', 'testcase': testcase_serializer.data, 'consoles': consoles_data, 'testruns': [v[0] for v in testruns]})

    @swagger_auto_schema(request_body=TestCaseSerializer)
    def post(self, request, testcase_uuid, format=None):
        name = request.data.get('name', '')  # *
        apptype = request.data.get('apptype', 'parallel')  # *
        user = request.data.get('user', '')  # *
        product = request.data.get('product', '')  # *
        browser = request.data.get('browser', 'Chrome')  # *
        build = request.data.get('build', '')  # *
        resolution = request.data.get('resolution', '')  # *
        leader_locale = request.data.get('leader_locale', 'en_US')  # *
        start_url = request.data.get('start_url', '')  # *
        locales = request.data.get('locales', '[]')  # *
        pool = request.data.get('pool', '')
        add_host = request.data.get('add_host', '')
        glossary = request.data.get('glossary', '')
        access_urllist = request.data.get('access_urllist', '')
        accessibility_data = request.data.get('accessibility_data', {
            'waveTaskId': -1,
            'login_required': False,
            'login_user': '',
            'login_password': '',
            'login_url': ''
        })
        # save json as string
        access_urllist = json.dumps(access_urllist)
        if isinstance(accessibility_data, dict):
            accessibility_data = json.dumps(accessibility_data)

        # handle accessibility-e2elib # temp apptype
        if apptype == 'accessibility-e2elib':
            apptype == 'accessibility'  # real apptype
            resolution = "1600x1200"
            start_url = "https://www.vmware.com"

        if (not name) or (not user) or (not product) or (not build):
            return Response({'message': 'Bad parameters'})
        if (not resolution) or (not start_url):
            return Response({'message': 'Bad parameters'})

        # check product
        ps = Product.objects.filter(name=product)
        if not len(ps):
            return Response({'message': 'Bad product'})
        current_product = ps[0]

        supported_locales = set(settings.LOCALE_MAP.values())
        locale_list = eval(locales)
        if type(locale_list) != list:
            return Response({'message': 'Bad locales'})
        # check locale_list
        for lc in locale_list:
            if (not lc) or (type(lc) != str):
                locale_list.remove(lc)
                continue
            items = lc.split('@')
            if (len(items) > 2) or (items[0] not in supported_locales):
                locale_list.remove(lc)
                continue

        # check resolution
        if resolution not in settings.RESOLUTIONS:
            return Response({'message': 'Bad resolution'})

        t = TestCase.objects.create(name=name,
                                    apptype=apptype,
                                    product=current_product,
                                    browser=browser,
                                    build_no=build,
                                    locales=locale_list,
                                    resolution=resolution,
                                    leader_locale=leader_locale,
                                    start_url=start_url,
                                    add_host=add_host,
                                    glossary=glossary,
                                    user=user,
                                    pool=pool,
                                    access_urllist=access_urllist,
                                    accessibility_data=accessibility_data)

        testcase_serializer = TestCaseSerializer(t)
        return Response({'message': 'success', 'testcase': testcase_serializer.data})

    @swagger_auto_schema(request_body=TestCaseSerializer)
    def put(self, request, testcase_uuid, format=None):
        testcases = TestCase.objects.filter(uuid=testcase_uuid)
        if not len(testcases):
            return Response({'message': 'Error TestCase'})

        current_testcase = testcases[0]
        if current_testcase.run_id != 0 or current_testcase.status != 'stopped':
            return Response({'message': 'Cannot edit test case: run_id > 0.'})

        name = request.data.get('name', current_testcase.name)  # *
        apptype = request.data.get('apptype', current_testcase.apptype)  # *
        user = request.data.get('user', current_testcase.user)  # *
        product = request.data.get('product', current_testcase.product)  # *
        browser = request.data.get('browser', current_testcase.browser)  # *
        build = request.data.get('build', current_testcase.build)  # *
        resolution = request.data.get('resolution', current_testcase.resolution)  # *
        leader_locale = request.data.get('leader_locale', current_testcase.leader_locale)  # *
        start_url = request.data.get('start_url', current_testcase.start_url)  # *
        locales = request.data.get('locales', current_testcase.locales)  # *
        pool = request.data.get('pool', current_testcase.pool)
        add_host = request.data.get('add_host', current_testcase.add_host)
        glossary = request.data.get('glossary', current_testcase.glossary)

        if (not name) or (not user) or (not product) or (not build):
            return Response({'message': 'Bad parameters'})
        if (not resolution) or (not start_url) or (not locales):
            return Response({'message': 'Bad parameters'})

        # check product
        ps = Product.objects.filter(name=product)
        if not len(ps):
            return Response({'message': 'Bad product'})
        current_product = ps[0]

        supported_locales = set(settings.LOCALE_MAP.values())
        locale_list = eval(locales)
        if type(locale_list) != list:
            return Response({'message': 'Bad locales'})
        # check locale_list
        for lc in locale_list:
            if (not lc) or (type(lc) != str):
                locale_list.remove(lc)
                continue
            items = lc.split('@')
            if (len(items) > 2) or (items[0] not in supported_locales):
                locale_list.remove(lc)
                continue

        # check resolution
        if resolution not in settings.RESOLUTIONS:
            return Response({'message': 'Bad resolution'})

        current_testcase.name = name
        current_testcase.apptype = apptype
        current_testcase.product = current_product
        current_testcase.browser = browser
        current_testcase.build_no = build
        current_testcase.locales = locale_list
        current_testcase.resolution = resolution
        current_testcase.leader_locale = leader_locale
        current_testcase.start_url = start_url
        current_testcase.add_host = add_host
        current_testcase.glossary = glossary
        current_testcase.user = user
        current_testcase.pool = pool

        current_testcase.save()

        testcase_serializer = TestCaseSerializer(current_testcase)
        return Response({'message': 'success', 'testcase': testcase_serializer.data})

    def delete(self, request, testcase_uuid, format=None):
        testcases = TestCase.objects.filter(uuid=testcase_uuid)
        if not len(testcases):
            return Response({'message': 'Error TestCase'})

        current_testcase = testcases[0]
        # soft delete
        # current_testcase.delete()
        current_testcase.softdeleted = True
        current_testcase.save()

        return Response({'message': 'success'})

    def patch(self, request, testcase_uuid, format=None):
        testcases = TestCase.objects.filter(uuid=testcase_uuid)
        if not len(testcases):
            return Response({'message': 'Error TestCase'})

        current_testcase = testcases[0]
        accessibility_data = request.data.get('accessibilityData', None)
        if accessibility_data is not None:
            current_testcase.accessibility_data = accessibility_data
        # soft delete
        # current_testcase.delete()
        # current_testcase.softdeleted = True
        current_testcase.save()

        return Response({'message': 'success'})


class TestStart(APIView):
    """
    Start Test
    """
    @csrf_exempt
    def dispatch(self, *args, **kwargs):
        return super(TestStart, self).dispatch(*args, **kwargs)

    def get_object(self, id):
        try:
            return TestCase.objects.get(id=id)
        except TestCase.DoesNotExist:
            return None

    def get_object_uuid(self, id):
        try:
            return TestCase.objects.get(uuid=id)
        except TestCase.DoesNotExist:
            return None

    def generate_default_json(self, console):
        console_date = console.createtime.strftime('%Y%m%d')
        console_folder = os.path.join(console_date, str(console.id) + '@' + str(console.appuuid))
        console_dir = os.path.join(settings.PARALLEL_ROOT, console_folder, 'config')
        os.makedirs(console_dir, exist_ok=True)
        content = {
            'server': console.params,
            'testcase': console.appuuid,
            'role': console.role,
            'autostart': 'true',
            'replay': 'false',
            'sendverify': 'false',
            'slavesnumber': 0,
            'prodjs': re.sub('[^a-zA-Z0-9]', '', console.appproduct.lower()) + '.js',
            'extensionid': '',
            'consoleid': console.id,
            'accessibility': 'false',
            'accessibility_user': '',
            'accessibility_password': '',
            'description': 'description'
        }
        with open(os.path.join(console_dir, 'default.json'), 'w') as fp:
            json.dump(content, fp, indent=4)
        os.chmod(os.path.join(console_dir, 'default.json'), 0o777)

        return console_folder

    def generate_compose_yml(self, console):
        console_date = console.createtime.strftime('%Y%m%d')
        console_folder = os.path.join(console_date, str(console.id) + '@' + str(console.appuuid))
        console_dir = os.path.join(settings.PARALLEL_ROOT, console_folder)
        os.makedirs(console_dir, exist_ok=True)
        template_doc = ""
        with open(os.path.join(os.path.dirname(__file__), 'template.yml'), 'r+', encoding='utf-8') as fp:
            template_doc = fp.read()

        proxy_tag = ""
        if hasattr(settings, 'HTTP_PROXY') and hasattr(settings, 'HTTPS_PROXY'):
            if not console.add_host and not console.apppool:
                # set proxy
                proxy_tag = 'http_proxy: {0}\n      https_proxy: {1}'.format(settings.HTTP_PROXY, settings.HTTPS_PROXY)
        add_hosts = ""
        if console.add_host:
            add_hosts = "extra_hosts:\n      "
            items = console.add_host.split(',')
            for itm in items:
                add_hosts += "        - " + itm + '\n'

        parallel_name = "%s-%s" % (console.apptype, console.id)
        port_tag = "${PARALLEL_PORT_" + str(console.id) + "}"
        content = template_doc.format(image=settings.PARALLEL_WORKER_IMAGE,
                                      container_name=parallel_name,
                                      VNC_RESOLUTION=console.resolution,
                                      BROWSER_LOCALE=console.locale,
                                      VNC_NAME=parallel_name,
                                      BROWSER_TYPE=console.browser,
                                      proxy_tag=proxy_tag,
                                      add_hosts=add_hosts,
                                      port_tag=port_tag)
        with open(os.path.join(console_dir, 'docker-compose.yml'), 'w') as fp:
            fp.write(content)
        os.chmod(os.path.join(console_dir, 'docker-compose.yml'), 0o777)
        return console_folder

    def post(self, request, test_uuid, format=None):
        pool_name = request.data.get('pool', '')  # *
        test_id = request.data.get('test_id', -1)

        current_testcase = self.get_object_uuid(test_uuid)
        if not current_testcase:
            current_testcase = self.get_object(test_id)
        if not current_testcase:
            return Response({'message': "Test doesn't exist"})

        if not current_testcase.start_url:
            serializer = TestCaseSerializer(current_testcase)
            return Response({'message': 'start_url is null', 'testcase': serializer.data})
        tests = TestCase.objects.filter(uuid=current_testcase.uuid, status='stopped').update(status='running',
                                                                                             pool=pool_name,
                                                                                             run_id=F('run_id') + 1,
                                                                                             lastruntime=datetime.now())
        if tests <= 0:
            serializer = TestCaseSerializer(current_testcase)
            return Response({'message': 'Test is already running now', 'testcase': serializer.data})

        new_consoles = []
        current_testcase = self.get_object(current_testcase.id)
        if current_testcase.apptype == 'parallel':
            # post leader first for parallel
            c = Console.objects.create(appname=current_testcase.name,
                                       apptype=current_testcase.apptype,
                                       appid=current_testcase.id,
                                       appuuid=current_testcase.uuid,
                                       appuser=current_testcase.user,
                                       appserver=settings.PARALLEL_SERVER,
                                       appproduct=current_testcase.product.name,
                                       apppool=current_testcase.pool,
                                       role='leader',
                                       browser=current_testcase.browser,
                                       locale=current_testcase.leader_locale,
                                       resolution=current_testcase.resolution,
                                       add_host=current_testcase.add_host,
                                       params=settings.PARALLEL_SERVER,
                                       start_url=current_testcase.start_url)
            new_consoles += [
                c,
            ]
            worker_locales = current_testcase.user_locales
            for loc in worker_locales:
                c = Console.objects.create(appname=current_testcase.name,
                                           apptype=current_testcase.apptype,
                                           appid=current_testcase.id,
                                           appuuid=current_testcase.uuid,
                                           appuser=current_testcase.user,
                                           appserver=settings.PARALLEL_SERVER,
                                           appproduct=current_testcase.product.name,
                                           apppool=current_testcase.pool,
                                           role='worker',
                                           browser=current_testcase.browser,
                                           locale=loc,
                                           resolution=current_testcase.resolution,
                                           add_host=current_testcase.add_host,
                                           params=settings.PARALLEL_SERVER,
                                           start_url=current_testcase.start_url)
                new_consoles += [
                    c,
                ]
        elif current_testcase.apptype == 'automation':
            c = Console.objects.create(appname=current_testcase.name,
                                       apptype=current_testcase.apptype,
                                       appid=current_testcase.id,
                                       appuuid=current_testcase.uuid,
                                       appuser=current_testcase.user,
                                       appserver=settings.PARALLEL_SERVER,
                                       appproduct=current_testcase.product.name,
                                       apppool=current_testcase.pool,
                                       role='leader',
                                       browser=current_testcase.browser,
                                       locale=current_testcase.leader_locale,
                                       resolution=current_testcase.resolution,
                                       add_host=current_testcase.add_host,
                                       params=settings.PARALLEL_SERVER,
                                       start_url=current_testcase.start_url)
            new_consoles += [
                c,
            ]
        else:
            Response({'message': 'apptype not supported', 'apptype': current_testcase.apptype})

        console_folders = []
        for c in new_consoles:
            f1 = self.generate_default_json(c)
            f2 = self.generate_compose_yml(c)

            if f1 and f1 == f2:
                console_folders.append({'path': f1, 'id': c.id, 'type': c.apptype})
        response = startConsoles(console_folders, pool='default')
        if response.get('message', '') != 'success':
            current_testcase.status = 'stopped'
            current_testcase.save()
            serializer = TestCaseSerializer(current_testcase)
            return Response({'message': response.get('message', ''), 'testcase': serializer.data})

        running_consoles = response.get('running_consoles')
        for c in new_consoles:
            result = running_consoles.get(str(c.id), {})
            if result.get('port', 0) > 0 and result.get('host', ''):
                c.status = 'running'
                c.host = result.get('host')
                c.port = result.get('port')
                c.deployment = result.get('uuid')
                c.save()

        serializer = TestCaseSerializer(current_testcase)
        console_serializer = SimpleConsoleSerializer(new_consoles, many=True)
        return Response({'message': 'success', 'testcase': serializer.data, 'consoles': console_serializer.data})


class TestStop(APIView):
    """
    Stop Test
    """
    @csrf_exempt
    def dispatch(self, *args, **kwargs):
        return super(TestStop, self).dispatch(*args, **kwargs)

    def get_object(self, id):
        try:
            return TestCase.objects.get(id=id)
        except TestCase.DoesNotExist:
            return None

    def get_object_uuid(self, id):
        try:
            return TestCase.objects.get(uuid=id)
        except TestCase.DoesNotExist:
            return None

    def post(self, request, test_uuid, format=None):
        test_id = request.data.get('test_id', -1)
        current_testcase = self.get_object_uuid(test_uuid)
        if not current_testcase:
            current_testcase = self.get_object(test_id)
        if not current_testcase:
            return Response({'message': "Test doesn't exist"})

        running_consoles = Console.objects.filter(appuuid=current_testcase.uuid, status='running')
        console_deployments = []
        for c in running_consoles:
            console_deployments.append(c.deployment)

        response = stopConsoles(console_deployments)
        logger.debug('stopConsoles: {}, {}'.format(console_deployments, response))
        if response.get('message', '') != 'success':
            serializer = TestCaseSerializer(current_testcase)
            return Response({'message': response.get('message', ''), 'testcase': serializer.data})

        for c in running_consoles:
            c.status = 'stopped'
            c.save()

        current_testcase.status = 'stopped'
        current_testcase.save()

        if current_testcase.apptype == 'automation':
            template = settings.DEFAULT_TEMPLATE
            newscript = Script.objects.create(
                test_id = current_testcase.id,
                run_id = current_testcase.run_id,
                user = current_testcase.user,
                product = current_testcase.product.name,
                name = current_testcase.name,
                description = "",
                template = template,
                events = ''
            )
            result = updateNewScriptFile(newscript, template)
            if result['message'] != 'success':
                testserializer = TestCaseSerializer(current_testcase)
                scriptserializer = ScriptSerializer(newscript)
                return Response({'message': result['message'], 'testcase': testserializer.data, 'script': scriptserializer.data})

        serializer = TestCaseSerializer(current_testcase)
        console_serializer = SimpleConsoleSerializer(running_consoles, many=True)
        return Response({'message': 'success', 'testcase': serializer.data, 'consoles': console_serializer.data})
