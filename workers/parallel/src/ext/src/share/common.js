
// Copyright 2022 VMware, Inc.
// SPDX-License-Identifier: Apache License 2.0

const vtaas = {
    constant: {
        STATUS_RUN: 'run',
        STATUS_PAUSE: 'pause',
        STATUS_STOP: 'stop',

        ROLE_LEADER: 'leader',
        ROLE_WORKER: 'worker',

        URL_RECORD: '/parallel/record/',
        URL_CONNECT: '/parallel/connect/',
        URL_STATUS: '/parallel/status/',

        TEST_TYPE_PARALLEL: 'parallel',
        TEST_TYPE_RECORDING: 'automation'
    },
    utils: {
        isRunning: function() {
            return vtaas.state.status === vtaas.constant.STATUS_RUN;
        },
        isPaused: function() {
            return vtaas.state.status === vtaas.constant.STATUS_PAUSE;
        },
        isStopped: function() {
            return vtaas.state.status === vtaas.constant.STATUS_STOP;
        },

        isLeader: function() {
            return vtaas.state.role === vtaas.constant.ROLE_LEADER;
        },
        isWorker: function() {
            return vtaas.state.role === vtaas.constant.ROLE_WORKER;
        },

        getUrl: function(path) {
            return "http://" + vtaas.state.server + ":" + vtaas.state.port + path;
        },
        getWsUrl: function(path) {
            return vtaas.state.otherServers.websocket + path;
        },
        getUrlRecord: function() {
            return this.getUrl(vtaas.constant.URL_RECORD);
        },
        getUrlConnect: function() {
            return this.getUrl(vtaas.constant.URL_CONNECT);
        },
        getUrlStatus: function() {
            return this.getUrl(vtaas.constant.URL_STATUS);
        },
        getUrlTextResources: function() {
            return this.getUrl('/parallel/textresources/search/');
        },
        getUrlAccessibilityBase: function() {
            return vtaas.state.otherServers.accessibility;
        },
        getUrlAccessibilityCreatingWaveTask: function() {
            return vtaas.state.otherServers.accessibility + `/accessibility/wavetask/`;
        },
        getUrlAccessibilityCheckPage: function(waveTaskId) {
            return vtaas.state.otherServers.accessibility + `/accessibility/wavetask/${waveTaskId}/checkpage`;
        },
        getUrlPageCacheDomCatchingScript: function() {
            return vtaas.state.otherServers.webPageCache + '/domcatchingscript';
        },
        getUrlPageCacheDomData: function() {
            return vtaas.state.otherServers.webPageCache + '/domdata';
        },

        getExtensionBaseUrl: function() {
            return chrome.runtime.getURL("/");
        },
    },
};

// Both backgroud and content scripts have these states
vtaas.state = {
    server: null,
    port: null,
    testcaseUuid: null,
    role: null,
    floatPanelDisplay: null,
    status: vtaas.constant.STATUS_STOP,
    statusPrevious: null,
    product: null,
    extensionid: null,
    testType: null,
    mouseOverOn: false,
    accessibilityEnabled: true,
}

vtaas.message = {
    ELEMENT_SELECT_BEGIN: 1,
    ELEMENT_SELECT_END: 2,
    ELEMENT_SELECT_CHANGED: 3,

    CONFIG_CHANGED: 4,
    STATUS_CHANGED: 5,

    FLOATPANEL_DISPLAY_CHANGED: 8,

    MSG_SHOW_ALERT: 14,

    MSG_MOUSEOVER_RECORD: 15,

    MSG_CONTROLPANEL_SHOW: 16,

    _registedHandlers: {},

    on: function(type, handler) {
        let arrEvents = this._registedHandlers[type];
        if (!arrEvents) {
            arrEvents = [];
            this._registedHandlers[type] = arrEvents;
        }
        arrEvents.push(handler);
    },

    off: function(type, handler) {
        let arrEvents = this._registedHandlers[type];
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
        var arrEvents = this._registedHandlers[type] || [];

        // make a copy of original one to support remove handler in itself
        arrEventsCopy = arrEvents.slice(0);
        arrEventsCopy.forEach(function(handler){
            handler(data);
        });
    }
};

// Register events
vtaas.message.on(vtaas.message.FLOATPANEL_DISPLAY_CHANGED, (msg) => {
    vtaas.state.floatPanelDisplay = msg.display;
});

vtaas.message.on(vtaas.message.STATUS_CHANGED, (msg) => {
    vtaas.state.statusPrevious = vtaas.state.status;
    vtaas.state.status = msg.status;
});

vtaas.message.on(vtaas.message.CONFIG_CHANGED, (state) => {
    function updateState(name, newState) {
        if (newState !== undefined) {
            vtaas.state[name] = newState;
        }
    }
    updateState('server', state.server);
    updateState('port', state.port);
    updateState('testcaseUuid', state.testcaseUuid);
    updateState('role', state.role);
});

vtaas.message.on(vtaas.message.MSG_MOUSEOVER_RECORD, (msg) => {
    vtaas.state.mouseOverOn = msg.mouseOverOn;
});