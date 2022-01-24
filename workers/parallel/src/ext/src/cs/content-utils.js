export const contentUtils = {
    displayElement: function(element, visible) {
        let dataKey = 'vtaas-display';
        let currentDisplay = $(element).css("display");
        if (visible) {
            let display = $(element).data(dataKey);
            if ((display || display === '') && currentDisplay === 'none') {
                $(element).css("display", display);
            }
        } else {
            if (currentDisplay !== 'none') {
                $(element).data(dataKey, currentDisplay);
                $(element).css("display", 'none');
            }
        }
    },

    resizeDialogByContentSize: function(dialogId, contentElement) {
        let height = $(contentElement).outerHeight(true);
        let width = $(contentElement).outerWidth(true);

        let msgData = {
            type: 'DIALOG_RESIZE',
            dialogId: dialogId,
            height: height + 'px',
            width: width + 'px'
        };
        window.top.postMessage(msgData, '*');
    },

    recordEvent: function(recordType, eventData) {
        let msgData = {
            type: 'RECORD_EVENT',
            recordType: recordType,
            eventData: eventData
        };
        window.top.postMessage(msgData, '*');
    },

    checkAccessibility: function(recordType, eventData) {
        let msgData = {
            type: 'CHECK_ACCESSIBILITY'
        };
        window.top.postMessage(msgData, '*');
    },

    postDataInBackground: function(url, data) {
        let promise = new Promise((resolve, reject) => {
            let requestData = {
                action: "post-server-data",
                url: url,
                data: data
            };
            chrome.runtime.sendMessage(requestData, function(response) {
                resolve(response.data);
            });
        });
        return promise;
    },

    cacheAccessibilityPageInBackground: function(data) {
        let promise = new Promise((resolve, reject) => {
            let requestData = {
                action: "cache-accessibility-page",
                data: data
            };
            chrome.runtime.sendMessage(requestData, function(response) {
                resolve(response.data);
            });
        });
        return promise;
    }
};

export class FrameDialog {
    static create(dialogId) {
        let msgData = {
            type: 'DIALOG_CREATE',
            dialogId: dialogId
        };
        window.top.postMessage(msgData, '*');
    }

    static destroy(dialogId) {
        let msgData = {
            type: 'DIALOG_DESTROY',
            dialogId: dialogId
        };
        window.top.postMessage(msgData, '*');
    }

    static show(dialogId) {
        let msgData = {
            type: 'DIALOG_SHOW',
            dialogId: dialogId
        };
        window.top.postMessage(msgData, '*');
    }

    static hide(dialogId) {
        let msgData = {
            type: 'DIALOG_HIDE',
            dialogId: dialogId
        };
        window.top.postMessage(msgData, '*');
    }

    static setPosition(dialogId, left, top, right, bottom) {
        let msgData = {
            type: 'DIALOG_SET_POSITION',
            dialogId: dialogId,
            left: left,
            top: top,
            right: right,
            bottom: bottom
        };
        window.top.postMessage(msgData, '*');
    }

    static setSize(dialogId, width, height) {
        let msgData = {
            type: 'DIALOG_SET_SIZE',
            dialogId: dialogId,
            width: width,
            height: height
        };
        window.top.postMessage(msgData, '*');
    }

    static setCssVisibility(dialogId, visibility) {
        let msgData = {
            type: 'DIALOG_SET_CSS_VISIBILITY',
            dialogId: dialogId,
            visibility: visibility
        };
        window.top.postMessage(msgData, '*');
    }

    static createScreenshotDialog() {
        this.create('vtaas-dialog-screenshot');
    }
}

function getBackgroundStateValue(variableName) {
    let promise = new Promise((resolve, reject) => {
        let requestData = {
            action: "get_state_value",
            variable: variableName
        };
        chrome.runtime.sendMessage(requestData, function(response) {
            resolve(response.value);
        });
    });
    return promise;
}

function setBackgroundStateValue(variableName, value) {
    let promise = new Promise((resolve, reject) => {
        let requestData = {
            action: "set_state_value",
            variable: variableName,
            value: value
        };
        chrome.runtime.sendMessage(requestData, function(response) {
            resolve(response.status);
        });
    });
    return promise;
}

export class RuntimeState {
    static getTextResources() {
        return getBackgroundStateValue("textResources");
    }

    static getProduct() {
        return getBackgroundStateValue("product");
    }

    static getLocale() {
        return getBackgroundStateValue("locale");
    }

    static setLocale(value) {
        return setBackgroundStateValue("locale", value);
    }

    static getServerHttpRootUrl() {
        return getBackgroundStateValue("serverHttpRootUrl");
    }

    static getMouseOverOn() {
        return getBackgroundStateValue("mouseOverOn");
    }

    static getMouseOverWaitTime() {
        return getBackgroundStateValue("mouseOverWaitTime");
    }

    static setMouseOverWaitTime(value) {
        return setBackgroundStateValue("mouseOverWaitTime", value);
    }
}

export function postServerData(url, sendData){
        return new Promise((resolve, reject) => {
            $.post({
                url: url,
                data: sendData,
                dataType: "json",
                contentType: "application/json; charset=UTF-8"
            }).done(function(data, textStatus, jqXHR) {
                if (data.message !== 'success') {
                    console.log("Post server data failed: " + data.message);
                    // reject(data.message);
                    // return;
                }
                resolve(data);
            }).fail(function(jqXHR, textStatus, errorThrown) {
                console.log("Post server data failed.", textStatus, errorThrown)
                reject(errorThrown);
            });
        });
}