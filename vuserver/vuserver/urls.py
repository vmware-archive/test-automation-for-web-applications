# Copyright 2022 VMware, Inc.
# SPDX-License-Identifier: Apache License 2.0

from django.conf.urls import include, url
from django.contrib import admin
from parallel.urls import parallel_patterns
from script.urls import script_patterns
from container_pool.urls import pool_patterns
from django.conf import settings
from django.contrib.auth.views import LoginView, LogoutView
from django.views.generic.base import RedirectView
from django.conf.urls.static import static
from django.http import HttpResponse
from rest_framework import permissions
from drf_yasg.views import get_schema_view
from drf_yasg import openapi

schema_view = get_schema_view(
   openapi.Info(
      title="Test Automation for Web Applications(TAWA) APIs",
      default_version='v1',
      description="TAWA is a next generation tool for automated testing of web applications.",
      contact=openapi.Contact(email="etcp-dev@vmware.com"),
      license=openapi.License(name="Apache 2.0"),
   ),
   public=True,
   permission_classes=(permissions.AllowAny,)
)

admin.site.site_header = u'VUServer Management'
favicon_view = RedirectView.as_view(url='/static/favicon.ico', permanent=True)


def index(request):
    return HttpResponse("success")


urlpatterns = [
    url(r'^$', index, name='success'),
    url(r'^favicon\.ico$', favicon_view),
    url(r'^accounts/login/$', LoginView.as_view(), name='login'),
    url(r'^accounts/logout/$', LogoutView.as_view(), name='logout'),
    url(r'^parallel/', include(parallel_patterns), name='parallel'),
    url(r'^script/', include(script_patterns), name='script'),
    url(r'^pool/', include(pool_patterns), name='pool'),
    url(r'^admin/', admin.site.urls, name='admin'),
    # url(r'', index),
    url(r'^api-auth/', include('rest_framework.urls', namespace='rest_framework')),

    url(r'^swagger(?P<format>\.json|\.yaml)$', schema_view.without_ui(cache_timeout=0), name='schema-json'),
    url(r'^swagger/$', schema_view.with_ui('swagger', cache_timeout=0), name='schema-swagger-ui'),
    url(r'^redoc/$', schema_view.with_ui('redoc', cache_timeout=0), name='schema-redoc'),
] + static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
