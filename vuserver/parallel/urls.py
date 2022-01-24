# Copyright 2022 VMware, Inc.
# SPDX-License-Identifier: Apache License 2.0

from django.conf.urls import url
# from rest_framework.urlpatterns import format_suffix_patterns
from . import views
from .views import Products, Locales, Resolutions
from .views import Connect, Record, ClientStatus, ShowTestcase
from .views import TestStart, TestStop, TestManager
from .capture import CaptureSaver, AutoCaptureUpload
from .capture import EventCapture, ShowCapture, ShowTestCaptures
from .views import SearchTests, UserTests, TestReport
from .stat import FullUsers, FullTests, FullEvents
from .event import EventsbyIDs, EventsbyScript, SingleRunEvents, SingleRunScriptEvents
from .event import LastEvent, StatUIEvents
from .event import SearchAssertEvents, SearchInputEvents
from .event import SearchSSHEvents, SearchTextEvents

app_name = 'parallel'

parallel_patterns = [
    # test
    url(r'^products/$', Products.as_view(), name='v1_api_browser_list'),
    url(r'^locales/$', Locales.as_view(), name='v1_api_locale_list'),
    url(r'^resolutions/$', Resolutions.as_view(), name='v1_api_resolution_list'),
    url(r'^live/(?P<testcase_uuid>[\w\-]+)$', ShowTestcase.as_view(), name='v1_api_testcase'),
    url(r'^xy/$', views.show_xy, name='show_xy'),
    url(r'^bp/$', views.show_bp, name='show_bp'),
    url(r'^connect/$', Connect.as_view(), name='v1_api_connect'),
    url(r'^record/$', Record.as_view(), name='v1_api_record'),
    url(r'^status/$', ClientStatus.as_view(), name='v1_api_clientstatus'),
    url(r'^usertests/(?P<username>.+)$', UserTests.as_view(), name='v1_api_usertests'),
    url(r'^search_tests$', SearchTests.as_view(), name='v1_api_searchtest'),
    url(r'^tests/(?P<testcase_uuid>[\w\-]+|)/report$', TestReport.as_view(), name='v1_api_testreport'),
    url(r'^tests/(?P<testcase_uuid>[\w\-]+|)$', TestManager.as_view(), name='v1_api_testmanager'),
    url(r'^tests/(?P<test_uuid>[^/]+)/start$', TestStart.as_view(), name='v1_api_test_start'),
    url(r'^tests/(?P<test_uuid>[^/]+)/stop$', TestStop.as_view(), name='v1_api_test_stop'),

    # capture
    url(r'^capture/$', CaptureSaver.as_view(), name='v1_api_capturesaver'),
    url(r'^auto_capture_upload/$', AutoCaptureUpload.as_view(), name='v1_api_captureupload'),
    url(r'^auto_screenshot_sync/$', AutoCaptureUpload.as_view(), name='v1_api_capturesync'),
    url(r'^capturedimage/(?P<event_id>\d+)$', EventCapture.as_view(), name='v1_api_eventcapture'),
    url(r'^capture/(?P<capture_uuid>[\w\-]+)$', ShowCapture.as_view(), name='v1_api_capture'),
    url(r'^captures/(?P<testcase_id>[\w\-]+|)/(?P<runid>\d+)$', ShowTestCaptures.as_view(), name='v1_api_captures'),

    # event
    url(r'^uievents_stat/(?P<start_tid>[\w\-]+|)/(?P<end_tid>[\w\-]+|)$',
        StatUIEvents.as_view(),
        name='v1_api_statevents'),
    url(r'^configurationuievents/$', EventsbyIDs.as_view(), name='v1_api_eventsbyids'),
    url(r'^uievents/(?P<testcase_id>[\w\-]+|)/(?P<runid>\d+)$', SingleRunEvents.as_view(), name='v1_api_singlerunevents'),
    url(r'^scriptevents/(?P<testcase_id>[\w\-]+|)/(?P<runid>\d+)$', SingleRunScriptEvents.as_view(), name='v1_api_singlerunscriptevents'),
    url(r'^last_event/(?P<testcase_id>[\w\-]+|)$', LastEvent.as_view(), name='v1_api_lastevent'),
    url(r'^config_events/(?P<scriptid>\d+)$', EventsbyScript.as_view(), name='v1_api_eventsbyscript'),
    url(r'^searchtext/$', SearchTextEvents.as_view(), name='v1_api_searchtext'),
    url(r'^searchinput/$', SearchInputEvents.as_view(), name='v1_api_searchinput'),
    url(r'^searchassert/$', SearchAssertEvents.as_view(), name='v1_api_searchassert'),
    url(r'^searchsshcommand/$', SearchSSHEvents.as_view(), name='v1_api_searchssh'),

    # statistics
    url(r'^users/$', FullUsers.as_view(), name='v1_api_fullusers'),
    url(r'^users/(?P<list_format>[\w]+)$', FullUsers.as_view(), name='v1_api_fullusers'),
    url(r'^users/(?P<list_format>[\w]+)/(?P<start_day>[\d]+|)(?:/(?P<end_day>[\d]+|))$',
        FullUsers.as_view(),
        name='v1_api_fullusers'),
    url(r'^fulltests/$', FullTests.as_view(), name='v1_api_fulltests'),
    url(r'^fulltests/(?P<list_format>[\w]+)$', FullTests.as_view(), name='v1_api_fulltests'),
    url(r'^fulltests/(?P<list_format>[\w]+)/(?P<start_day>[\d]+|)(?:/(?P<end_day>[\d]+|))$',
        FullTests.as_view(),
        name='v1_api_fulltests'),
    url(r'^fulluievents$', FullEvents.as_view(), name='v1_api_fullevents'),
    url(r'^fulluievents/(?P<start_day>[\d]+|)(?:/(?P<end_day>[\d]+|))$',
        FullEvents.as_view(),
        name='v1_api_fullevents')
]