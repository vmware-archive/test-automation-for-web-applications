# Copyright 2022 VMware, Inc.
# SPDX-License-Identifier: Apache License 2.0

from datetime import datetime

from django.contrib.auth.models import User
from django.db.models import Count
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Product, TestCase, UIEvent
from .serializers import ProductSerializer, TestCaseSerializer


def get_formate_time(start_day):
    """
    Deal with request params to get formate time.
    """
    start_time = None
    if not start_day:
        is_valid_time = False
    elif len(start_day) == 8:
        is_valid_time = True
        start_time = datetime.strptime(start_day, "%Y%m%d")
    elif len(start_day) == 14:
        is_valid_time = True
        start_time = datetime.strptime(start_day, "%Y%m%d%H%M%S")
    else:
        is_valid_time = False

    return is_valid_time, start_time


class FullUsers(APIView):
    """
    User statistics.
    """
    def get(self, request, list_format="user", start_day="", end_day="", format=None):
        """
        Show all users during a period.
        """

        is_valid_start_time, start_time = get_formate_time(start_day)
        is_valid_end_time, end_time = get_formate_time(end_day)

        names = []
        if list_format == "user":
            if is_valid_start_time and is_valid_end_time:
                result_list = User.objects.filter(last_login__gte=start_time,
                                                  last_login__lte=end_time).order_by('-id')
            elif is_valid_start_time:
                result_list = User.objects.filter(last_login__gte=start_time).order_by('-id')
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
            if is_valid_start_time and is_valid_end_time:
                result_list = User.objects.filter(last_login__gte=start_time,
                                                  last_login__lte=end_time).order_by('-id')
            elif is_valid_start_time:
                result_list = User.objects.filter(last_login__gte=start_time).order_by('-id')
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

        is_valid_start_time, start_time = get_formate_time(start_day)
        is_valid_end_time, end_time = get_formate_time(end_day)

        if list_format == "test":
            if is_valid_start_time and is_valid_end_time:
                result_list = TestCase.objects.filter(createtime__gte=start_time,
                                                      createtime__lte=end_time).order_by('-id')
            elif is_valid_start_time:
                result_list = TestCase.objects.filter(createtime__gte=start_time).order_by('-id')
            else:
                result_list = TestCase.objects.filter().order_by('-id')
            res = TestCaseSerializer(result_list, many=True).data
        elif list_format == "product":
            if is_valid_start_time and is_valid_end_time:
                result_list = TestCase.objects.filter(
                    createtime__gte=start_time,
                    createtime__lte=end_time).values('product').annotate(ucount=Count('product')).order_by('-ucount')
            elif is_valid_start_time:
                result_list = TestCase.objects.filter(createtime__gte=start_time).values('product').annotate(
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
        elif list_format == "user":
            if is_valid_start_time and is_valid_end_time:
                result_list = TestCase.objects.filter(
                    createtime__gte=start_time,
                    createtime__lte=end_time).values('user').annotate(ucount=Count('user')).order_by('-ucount')
            elif is_valid_start_time:
                result_list = TestCase.objects.filter(createtime__gte=start_time).values('user').annotate(
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
            if is_valid_start_time and is_valid_end_time:
                query = TestCase.objects.filter(createtime__gte=start_time, createtime__lte=end_time)
                result_list = query.values('user').annotate(ucount=Count('user')).order_by('-ucount')
                result_listP = query.values('product').annotate(ucount=Count('product')).order_by('-ucount')
            elif is_valid_start_time:
                query = TestCase.objects.filter(createtime__gte=start_time)
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

        is_valid_start_time, start_time = get_formate_time(start_day)
        is_valid_end_time, end_time = get_formate_time(end_day)

        # Only support uievents usage, or there will be too many
        if is_valid_start_time and is_valid_end_time:
            result_list = UIEvent.objects.filter(recordtime__gte=start_time,
                                                 recordtime__lte=end_time).count()
        elif is_valid_start_time:
            result_list = UIEvent.objects.filter(recordtime__gte=start_time).count()
        else:
            result_list = UIEvent.objects.filter().count()
        res = result_list
        return Response({'message': 'success', 'data': res})
