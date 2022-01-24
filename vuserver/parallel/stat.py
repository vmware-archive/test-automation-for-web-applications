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


class FullUsers(APIView):
    """
    User statistics.
    """
    def get(self, request, list_format="user", start_day="", end_day="", format=None):
        """
        Show all users during a period.
        """
        isValidStartTime = False
        isValidEndTime = False

        if not start_day:
            isValidStartTime = False
        if not end_day:
            isValidEndTime = False

        if (len(start_day) == 8):
            isValidStartTime = True
            startTime = datetime.strptime(start_day, "%Y%m%d")
        elif (len(start_day) == 14):
            isValidStartTime = True
            startTime = datetime.strptime(start_day, "%Y%m%d%H%M%S")
        else:
            isValidStartTime = False

        if (len(end_day) == 8):
            isValidEndTime = True
            endTime = datetime.strptime(end_day, "%Y%m%d")
        elif (len(end_day) == 14):
            isValidEndTime = True
            endTime = datetime.strptime(end_day, "%Y%m%d%H%M%S")
        else:
            isValidEndTime = False

        names = []
        if (list_format == "user"):
            if (isValidStartTime and isValidEndTime):
                result_list = User.objects.filter(last_login__gte=startTime, last_login__lte=endTime).order_by('-id')
            elif (isValidStartTime):
                result_list = User.objects.filter(last_login__gte=startTime).order_by('-id')
            else:
                result_list = User.objects.filter().order_by('-id')
            for u in result_list:
                if u.is_superuser:
                    continue
                names += [
                    u.username,
                ]
            res = names
        else:
            if (isValidStartTime and isValidEndTime):
                result_list = User.objects.filter(last_login__gte=startTime, last_login__lte=endTime).order_by('-id')
            elif (isValidStartTime):
                result_list = User.objects.filter(last_login__gte=startTime).order_by('-id')
            else:
                result_list = User.objects.filter().order_by('-id')
            for u in result_list:
                if u.is_superuser:
                    continue
                names += [[u.username, u.first_name]]
            res = {"count": len(names), "details": names}
        return Response({'message': 'success', 'data': res})

    def post(self, request):
        name = request.data.get('name', '')  # *
        password = request.data.get('password', 'v')  # *
        if (not name) or (not password):
            return Response({'message': 'Bad parameters'})

        # check user
        users = User.objects.filter(username=name)
        if len(users):
            users[0].last_login = datetime.now()
            if not users[0].first_name:
                users[0].first_name = '0'
            users[0].first_name = str(int(users[0].first_name) + 1)
            users[0].save()
            return Response({'message': 'Already exist', 'name': name})
        else:
            u = User.objects.create_user(name, name + "@vu.com", password)
            u.is_staff = True
            u.last_login = datetime.now()
            u.first_name = '1'
            u.save()
        return Response({'message': 'success', 'name': name})


class FullTests(APIView):
    """
    Test statistics
    """
    def get(self, request, list_format="test", start_day="", end_day="", format=None):
        """
        Show all tests during a period.
        """
        isValidStartTime = False
        isValidEndTime = False

        if not start_day:
            isValidStartTime = False
        if not end_day:
            isValidEndTime = False

        if (len(start_day) == 8):
            isValidStartTime = True
            startTime = datetime.strptime(start_day, "%Y%m%d")
        elif (len(start_day) == 14):
            isValidStartTime = True
            startTime = datetime.strptime(start_day, "%Y%m%d%H%M%S")
        else:
            isValidStartTime = False

        if (len(end_day) == 8):
            isValidEndTime = True
            endTime = datetime.strptime(end_day, "%Y%m%d")
        elif (len(end_day) == 14):
            isValidEndTime = True
            endTime = datetime.strptime(end_day, "%Y%m%d%H%M%S")
        else:
            isValidEndTime = False

        if (list_format == "test"):
            if (isValidStartTime and isValidEndTime):
                result_list = TestCase.objects.filter(createtime__gte=startTime, createtime__lte=endTime).order_by('-id')
            elif (isValidStartTime):
                result_list = TestCase.objects.filter(createtime__gte=startTime).order_by('-id')
            else:
                result_list = TestCase.objects.filter().order_by('-id')
            res = TestCaseSerializer(result_list, many=True).data
        elif (list_format == "product"):
            if (isValidStartTime and isValidEndTime):
                result_list = TestCase.objects.filter(
                    createtime__gte=startTime,
                    createtime__lte=endTime).values('product').annotate(ucount=Count('product')).order_by('-ucount')
            elif (isValidStartTime):
                result_list = TestCase.objects.filter(createtime__gte=startTime).values('product').annotate(
                    ucount=Count('product')).order_by('-ucount')
            else:
                result_list = TestCase.objects.filter().values('product').annotate(ucount=Count('product')).order_by('-ucount')
            names = []
            countTest = 0
            # get all product list
            products = Product.objects.all()
            if not len(products):
                return Response({'message': 'No product'})
            products_serializer = ProductSerializer(products, many=True)
            ps_data = products_serializer.data
            ps_json = {}
            for p in ps_data:
                pid = p.get('id')
                pname = p.get('name')
                ps_json[pid] = pname
            for u in result_list:
                pn = ps_json[u['product']]
                names += [[pn, u['ucount']]]
                countTest += u['ucount']
            res = {"countProduct": len(names), "countTest": countTest, "details": names}
        elif (list_format == "user"):
            if (isValidStartTime and isValidEndTime):
                result_list = TestCase.objects.filter(
                    createtime__gte=startTime,
                    createtime__lte=endTime).values('user').annotate(ucount=Count('user')).order_by('-ucount')
            elif (isValidStartTime):
                result_list = TestCase.objects.filter(createtime__gte=startTime).values('user').annotate(
                    ucount=Count('user')).order_by('-ucount')
            else:
                result_list = TestCase.objects.filter().values('user').annotate(ucount=Count('user')).order_by('-ucount')
            names = []
            countTest = 0
            for u in result_list:
                names += [[u['user'], u['ucount']]]
                countTest += u['ucount']
            res = {"countUser": len(names), "countTest": countTest, "details": names}
        else:
            if (isValidStartTime and isValidEndTime):
                query = TestCase.objects.filter(createtime__gte=startTime, createtime__lte=endTime)
                result_list = query.values('user').annotate(ucount=Count('user')).order_by('-ucount')
                result_listP = query.values('product').annotate(ucount=Count('product')).order_by('-ucount')
            elif (isValidStartTime):
                query = TestCase.objects.filter(createtime__gte=startTime)
                result_list = query.values('user').annotate(ucount=Count('user')).order_by('-ucount')
                result_listP = query.values('product').annotate(ucount=Count('product')).order_by('-ucount')
            else:
                query = TestCase.objects.filter()
                result_list = query.values('user').annotate(ucount=Count('user')).order_by('-ucount')
                result_listP = query.values('product').annotate(ucount=Count('product')).order_by('-ucount')
            names = []
            countTest = 0
            for u in result_list:
                names += [[u['user'], u['ucount']]]
                countTest += u['ucount']
            res = {"countUser": len(names), "countTest": countTest, "details": names}
            # append product info
            namesP = []
            countTestP = 0
            # get all product list
            products = Product.objects.all()
            if not len(products):
                return Response({'message': 'No product'})
            products_serializer = ProductSerializer(products, many=True)
            ps_data = products_serializer.data
            ps_json = {}
            for p in ps_data:
                pid = p.get('id')
                pname = p.get('name')
                ps_json[pid] = pname
            for u in result_listP:
                pn = ps_json[u['product']]
                namesP += [[pn, u['ucount']]]
                countTestP += u['ucount']
            res["countProduct"] = len(namesP)
            res["countTestProduct"] = countTestP
            res["detailsProduct"] = namesP
        return Response({'message': 'success', 'data': res})


class FullEvents(APIView):
    """
    Test statistics
    """
    def get(self, request, start_day="", end_day="", format=None):
        """
        Show all events during a period.
        """
        isValidStartTime = False
        isValidEndTime = False

        if not start_day:
            isValidStartTime = False
        if not end_day:
            isValidEndTime = False

        if (len(start_day) == 8):
            isValidStartTime = True
            startTime = datetime.strptime(start_day, "%Y%m%d")
        elif (len(start_day) == 14):
            isValidStartTime = True
            startTime = datetime.strptime(start_day, "%Y%m%d%H%M%S")
        else:
            isValidStartTime = False

        if (len(end_day) == 8):
            isValidEndTime = True
            endTime = datetime.strptime(end_day, "%Y%m%d")
        elif (len(end_day) == 14):
            isValidEndTime = True
            endTime = datetime.strptime(end_day, "%Y%m%d%H%M%S")
        else:
            isValidEndTime = False

        # Only support uievents usage, or there will be too many
        if (isValidStartTime and isValidEndTime):
            result_list = UIEvent.objects.filter(recordtime__gte=startTime, recordtime__lte=endTime).count()
        elif (isValidStartTime):
            result_list = UIEvent.objects.filter(recordtime__gte=startTime).count()
        else:
            result_list = UIEvent.objects.filter().count()
        res = result_list
        return Response({'message': 'success', 'data': res})
