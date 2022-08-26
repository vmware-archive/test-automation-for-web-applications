# Copyright 2022 VMware, Inc.
# SPDX-License-Identifier: Apache License 2.0

import json
import logging
from urllib import parse

from asgiref.sync import async_to_sync
from channels.generic.websocket import JsonWebsocketConsumer
from channels.layers import get_channel_layer

logger = logging.getLogger('parallel')


def send_ws_message(product,
                    uuid,
                    name,
                    start_url,
                    message,
                    client_uuid,
                    sn,
                    glossary=''):
    """
        Called to send a message to the room on behalf of a client.
        """
    websocket_group = "testcase-%s" % uuid
    final_msg = {
        'product': str(product),
        'testcase': str(uuid),
        'message': message,
        'client': client_uuid,
        'name': name,
        'start_url': start_url,
        'glossary': glossary,
        'sn': sn
    }

    # Send out the message to everyone watching this testcase
    logger.info('send_ws_message: {0}'.format(sn))
    layer = get_channel_layer()
    async_to_sync(layer.group_send)(websocket_group, {
        "type": "ws_message",
        "text": json.dumps(final_msg)
    })


def send_ws_status(uuid, role, locale, action, data):
    """
        Called to send a message to the room on behalf of a client.
        """
    status_group = "status-%s" % uuid
    final_msg = {
        'role': role,
        'locale': locale,
        'action': action,
        'data': data
    }
    logger.info('send_ws_status: {0}'.format(final_msg))
    layer = get_channel_layer()
    async_to_sync(layer.group_send)(status_group, {
        "type": "status_message",
        "text": json.dumps(final_msg)
    })


class WSConsumer(JsonWebsocketConsumer):
    def connect(self):
        self.accept()
        params = parse.parse_qs(self.scope['query_string'])
        testcase_uuid = ''
        if b"testcase" in params:
            testcase_uuid = params[b"testcase"][0].decode("utf8")

        logger.info('ws_connect: {0}'.format(testcase_uuid))

        self.websocket_group_name = "testcase-%s" % testcase_uuid
        self.status_group_name = "status-%s" % testcase_uuid

        async_to_sync(self.channel_layer.group_add)(self.websocket_group_name,
                                                    self.channel_name)

    def disconnect(self, code):
        async_to_sync(self.channel_layer.group_discard)(
            self.websocket_group_name, self.channel_name)

    def receive(self, text_data):
        text_data_json = json.loads(text_data)
        message = text_data_json['message']

        async_to_sync(self.channel_layer.group_send)(self.websocket_group_name,
                                                     {
                                                         "type": "ws_message",
                                                         'message': message
                                                     })

    def ws_message(self, event):
        message = event['text']

        # Send message to WebSocket
        self.send(text_data=json.dumps({'message': message}))


class StatusConsumer(JsonWebsocketConsumer):
    def connect(self):
        self.uuid = self.scope['url_route']['kwargs']['testcase_uuid']
        params = parse.parse_qs(self.scope['query_string'])
        role = ''
        if b'role' in params:
            role = params[b'role'][0].decode("utf8")
            self.accept()
        else:
            self.accept()

        self.status_group_name = self.get_status_group(role, self.uuid)
        self.role = role

        logger.info('Status ws_connect: {0}'.format(self.status_group_name))

        async_to_sync(self.channel_layer.group_add)(self.status_group_name,
                                                    self.channel_name)

    def disconnect(self, code):
        async_to_sync(self.channel_layer.group_discard)(self.status_group_name,
                                                        self.channel_name)

    def receive(self, text_data):
        message = json.loads(text_data)

        if self.role == 'leader':
            async_to_sync(self.channel_layer.group_send)(self.get_status_group(
                'worker', self.uuid), {
                    "type": "status_message",
                    'message': message
                })
        else:
            async_to_sync(self.channel_layer.group_send)(self.get_status_group(
                'leader', self.uuid), {
                    "type": "status_message",
                    'message': message
                })

    def status_message(self, event):
        message = event

        # Send message to WebSocket
        self.send(text_data=json.dumps({'message': message}))

    def get_status_group(self, role, testcase_uuid):
        if role:
            return "status-%s-%s" % (role, testcase_uuid)
        else:
            return "status-%s" % testcase_uuid
