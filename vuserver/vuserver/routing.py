# Copyright 2022 VMware, Inc.
# SPDX-License-Identifier: Apache License 2.0

from channels.auth import AuthMiddlewareStack
from channels.routing import ProtocolTypeRouter, URLRouter
from django.conf.urls import url

from parallel import consumers

application = ProtocolTypeRouter({
    # Channels will do this for you automatically. It's included here as an example.
    # "http": AsgiHandler,

    # Route all WebSocket requests to our custom chat handler.
    # We actually don't need the URLRouter here, but we've put it in for
    # illustration. Also note the inclusion of the AuthMiddlewareStack to
    # add users and sessions - see http://channels.readthedocs.io/en/latest/topics/authentication.html
    "websocket": AuthMiddlewareStack(
        URLRouter([
            # URLRouter just takes standard Django path() or url() entries.
            url(r'subscribe/$', consumers.WSConsumer),
            url(r'status/(?P<testcase_uuid>[^/]+)/$', consumers.StatusConsumer),
        ]),
    ),
})