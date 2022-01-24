
// Copyright 2022 VMware, Inc.
// SPDX-License-Identifier: Apache License 2.0

export const vtaasMessage = {
    ELEMENT_SELECT_BEGIN: 1,
    ELEMENT_SELECT_END: 2,
    ELEMENT_SELECT_CHANGED: 3,

    CONFIG_CHANGED: 4,
    STATUS_CHANGED: 5,

    FLOATPANEL_DISPLAY_CHANGED: 8,

    MODIFY_FRAMEWINDOW_SIZE: 9,

    MSG_DRAG_START: 10,
    MSG_DRAG_MOVE: 11,
    MSG_DRAG_END: 12,

    TEXT_RESOURCE_SELECTION: 13,

    MSG_SHOW_ALERT: 14,

    MSG_MOUSEOVER_RECORD: 15,

    MSG_CONTROLPANEL_SHOW: 16,

    _handlers: {},
    _messagePort: null,

    on: function(type, handler) {
        let arrEvents = this._handlers[type];
        if (!arrEvents) {
            arrEvents = [];
            this._handlers[type] = arrEvents;
        }
        arrEvents.push(handler);
    },

    off: function(type, handler) {
        let arrEvents = this._handlers[type];
        if (!arrEvents) {
            console.log("There is no any handler for event [" + type + "].");
            return;
        }
        let index = arrEvents.findIndex((element) => element === handler);
        if (index === -1) {
            console.log("Can not find the specified handler to remove for event [" + type + "].");
            return;
        }
        arrEvents.splice(index, 1);
    },

    emit: function(type, data) {
        let arrEvents = this._handlers[type] || [];

        // make a copy of original one to support remove handler in itself
        const arrEventsCopy = arrEvents.slice(0);
        arrEventsCopy.forEach(function(handler){
            handler(data);
        });
    },

    broadcast: function(type, data){
        this._messagePort.post(type, data);
    },

    init: function(isBackground) {
        if (this._messagePort) {
            console.warn('vtaasMessage should only be inited once');
            return;
        }
        if (isBackground) {
            this._messagePort = new BackgroundPort(this);
        } else {
            this._messagePort = new ContentPort(this);
        }
    }
};

class ContentPort {
    constructor(messager) {
        this.messager = messager;
        this.eventPort = null;

        this.init();
    }

    init() {
        this.eventPort = chrome.runtime.connect();

        this.eventPort.onMessage.addListener(msg => {
            console.log('Received port message.', msg);
            this.messager.emit(msg.type, msg.data);
        });
        console.log('Content script port inited.');
    }

    post(type, data) {
        this.eventPort.postMessage({
            type: type,
            data: data
        });
    }
}

class BackgroundPort {
    constructor(messager) {
        this.messager = messager;
        this.mapPorts = {};
        this.maxPortId = 0;

        this.init();
    }

    init() {
        chrome.runtime.onConnect.addListener((port) => {
            console.log("port name: " + port.name);
            if ( port.name === 'message') {
                let portId = this.maxPortId++;
                this.mapPorts[portId] = port;

                port.onMessage.addListener((msg) => {
                    this.post(msg.type, msg.data);
                });

                port.onDisconnect.addListener((port) => {
                    delete this.mapPorts[portId];
                });
            }
        });
    }

    post(type, data) {
        console.log('broadcast message, type: ' + type, data);
        this.messager.emit(type, data);

        msg = {type: type, data: data};
        for(let portId in this.mapPorts){
            let port = this.mapPorts[portId];
            let tabId = port.sender.tab.id;
            // Send the message back, all the port (including port in iframe)
            // will receive it.
            port.postMessage(msg);
        }
    }
}