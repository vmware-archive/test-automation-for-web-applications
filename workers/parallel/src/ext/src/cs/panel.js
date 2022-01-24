vtaas.ui = {};

__ = function(str){
    var args = arguments;
        // i18n
    let i18n = {};
    str = i18n[str] || str;
    var count = 0;
    str = str.replace(/%s/g, function(){
        count ++;
        return args[count] || '';
    });
    return str;
}

vtaas.messagePort = {
    eventPort: null,

    init: function() {
        this.eventPort = chrome.runtime.connect();
        this.eventPort.onMessage.addListener(msg => {
            console.log('Received port message.', msg);
            vtaas.message.emit(msg.type, msg.data);
        });
        console.log('backgroundPort inited.');
    },

    post: function(type, data){
        this.eventPort.postMessage({
            type: type,
            data: data
        });
    },

    broadcast: function(type, data) {
        this.post(type, data);
    }
};

vtaas.utils.getSystemState = function() {
    return  new Promise((resolve, reject) => {
        chrome.runtime.sendMessage({action: "get_status"}, function(response) {
            if (response === undefined) {
                console.log('Failed to get response for message: get_status, error message: ' +
                        chrome.runtime.lastError);
                //reject('Failed to get response for message [get_status]')
                resolve(null);
            }
            resolve(response);
        });
    });
};

vtaas.utils.resumeAfterOperation = function() {
    if (vtaas.state.statusPrevious && vtaas.state.statusPrevious === vtaas.constant.STATUS_RUN) {
        vtaas.messagePort.broadcast(vtaas.message.STATUS_CHANGED, {status: vtaas.state.statusPrevious});
    }
};

vtaas.utils.pauseBeforeOperation = function() {
    if (vtaas.utils.isRunning()) {
        vtaas.messagePort.broadcast(vtaas.message.STATUS_CHANGED, {status: vtaas.constant.STATUS_PAUSE});
    } else {
        vtaas.state.statusPrevious = null;
    }
};

vtaas.utils.needRecording = function(target) {
    if (vtaas.utils.isInToolsPannel(target) || !vtaas.utils.isRunning()) {
        return false;
    }
    // No recording if target is iframe element
    if(/iframe/gi.test(target.tagName)) {
        return false;
    }
    return true;
};

vtaas.utils.isInToolsPannel = function(target) {
    return !vtaas.utils.isNotInToolsPannel(target);
};

vtaas.utils.isNotInToolsPannel = function(target) {
    while(target){
        if(/vtaas/.test(target.className)){
            return false;
        }
        target = target.parentNode;
    }
    return true;
};

vtaas.utils.getElementProperty = function(type, element, param) {
    let result = '';
    switch(type) {
        case 'val':
            result = element.value || '';
            break;
        case 'text':
            var text = element.textContent || '';
            text = text.replace(/^\s+|\s+$/g, '');
            result = text;
            break;
        case 'displayed':
            result = 'true';
            break;
        case 'enabled':
            result = element.disabled ? 'false' : 'true';
            break;
        case 'selected':
            result = element.checked ? 'true' : 'false';
            break;
        case 'attr':
            if(param){
                result = element.getAttribute(param) || '';
            }
            break;
        case 'css':
            if(param){
                let styles = window.getComputedStyle(element, null);
                result = styles.getPropertyValue(param) || '';
            }
            break;
    }
    return result;
};

vtaas.utils.isIframe = function() {
    return window.self !== window.top;
};

vtaas.utils.displayElement = function(element, visible) {
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
};

vtaas.utils.createDialog = function(id, url, centerDialog, visible=true) {
    let iframeDialog = $("<iframe></iframe>");
    iframeDialog.addClass('vtaas-frame-dialog');
    iframeDialog.attr("id", id);
    iframeDialog.attr("src",  vtaas.utils.getExtensionBaseUrl() + url);
    iframeDialog.appendTo('body');

    if (centerDialog) {
        vtaas.utils.centerDialog(iframeDialog.get(0));
    }
    if (!visible) {
        vtaas.utils.displayElement(iframeDialog.get(0), false);
    }
    return iframeDialog;
};

vtaas.utils.centerDialog = function(dialog) {
    let left = ($(window).width() - $(dialog).width()) / 2;
    let top = ($(window).height() - $(dialog).height()) / 2;
    dialog.style.top = top + 'px';
    dialog.style.left = left + 'px';
};

vtaas.utils.createScreenshotDialog = function() {
    vtaas.utils.createDialog("vtaas-dialog-screenshot", "src/cs/screenshot/index.html", true);
};

vtaas.utils.createAssertionDialog = function() {
    vtaas.utils.createDialog("vtaas-dialog-assertion", "src/cs/assertion/index.html", true);
};

vtaas.utils.createTextResourceDialog = function() {
    vtaas.utils.createDialog("vtaas-dialog-text-resource", "src/cs/text-resource/index.html", true);
};

vtaas.utils.createReplayProgressDialog = function(visible) {
    vtaas.utils.createDialog("vtaas-dialog-replay-progress", "src/cs/replay-progress/index.html", false, visible);
};

vtaas.utils.createConfigurationDialog = function() {
    vtaas.utils.createDialog("vtaas-dialog-configuration", "src/cs/configuration/index.html", true);
};

vtaas.utils.createControlPanelDialog = function() {
    vtaas.utils.createDialog("vtaas-dialog-control-panel", "src/cs/control-panel/index.html", false);
};

vtaas.utils.createExecutionDialog = function() {
    vtaas.utils.createDialog("vtaas-dialog-execution", "src/cs/execution/index.html", true);
};

vtaas.utils.createElementSelectorPathDialog = function() {
    vtaas.utils.createDialog("vtaas-dialog-elementselectorpath", "src/cs/element-select/path-index.html", false);
};

vtaas.utils.createNotificationDialog = function() {
    vtaas.utils.createDialog("vtaas-dialog-notification", "src/cs/notification/index.html", false);
};

(function() {
    function createDivDialog(htmlText, classAttr, appendDom) {
        let rootElement = document.createElement("div");
        //rootElement.style.display = 'none';
        $(rootElement).addClass('vtaas-modal');
        if (classAttr) {
            $(rootElement).addClass(classAttr);
        }

        rootElement.innerHTML = htmlText;
        if (appendDom === undefined || appendDom === true) {
           document.body.appendChild(rootElement);
        }
        return rootElement;
    };

    //////////////////////////////////////////////////////////////////////
    // ElementSelector
    vtaas.ui.ElementSelector = ElementSelector = function() {
        this.rootElement = null;
        this.selectedElement = null;

        this.mouseMoveHandler = null;

        this.initUi();
        this.initUiEvent();
        this._registerEvents();

        this.hide();
    };

    ElementSelector.prototype.initUi = function() {
        this.rootElement = createDivDialog('', 'vtaas-element-selector', false);
    };

    ElementSelector.prototype.initUiEvent = function() {
        this.rootElement.addEventListener('click', (event) => {
            event.stopPropagation();
            event.preventDefault();

            let data = {};
            if(this.selectedElement !== null){
                elementInfo = new TestRecorder.ElementInfo(this.selectedElement);
                data = {
                    tagName: elementInfo.tagName,
                    text: elementInfo.text,
                    class: elementInfo.class,
                    value: elementInfo.value,
                    id: elementInfo.id,
                    obj_left: elementInfo.rect.left.toFixed(2),
                    obj_top: elementInfo.rect.top.toFixed(2),
                    obj_right: elementInfo.rect.right.toFixed(2),
                    obj_bottom: elementInfo.rect.bottom.toFixed(2),
                    obj_scrolltop: elementInfo.scrolltop.toFixed(2),
                    obj_scrollleft: elementInfo.scrollleft.toFixed(2),
                    xpath: elementInfo.xpath,
                    xpath2: elementInfo.xpath2,
                    xpath3: elementInfo.xpath3,
                    xpath4: elementInfo.xpath4,
                    selector: elementInfo.selector,
                    verify_type: elementInfo.verify_type,
                    verify_value: elementInfo.verify_value,
                };
            }
            vtaas.messagePort.broadcast(vtaas.message.ELEMENT_SELECT_END, data);
        });

        this.mouseMoveHandler = (event) => {
            event.stopPropagation();
            event.preventDefault();

            this.rootElement.style.display = 'none';
            let newSelectedElement = document.elementFromPoint(event.clientX, event.clientY);
            if(newSelectedElement && vtaas.utils.isNotInToolsPannel(newSelectedElement) &&
                    /^(HTML|IFRAME)$/i.test(newSelectedElement.tagName) === false){
                this.rootElement.style.display = 'block';
                if(newSelectedElement !== this.selectedElement){
                    var rect = newSelectedElement.getBoundingClientRect();
                    this.rootElement.style.left = rect.left+'px';
                    this.rootElement.style.top = rect.top+'px';
                    this.rootElement.style.width = rect.width+'px';
                    this.rootElement.style.height = rect.height+'px';
                    this.selectedElement = newSelectedElement;

                    vtaas.messagePort.broadcast(vtaas.message.ELEMENT_SELECT_CHANGED, {
                        xpath: new TestRecorder.ElementInfo(this.selectedElement).xpath
                    });
                }
            }
        };
    };

    ElementSelector.prototype._registerEvents = function() {
        vtaas.message.on(vtaas.message.ELEMENT_SELECT_BEGIN, (event) => {
            this.show();
        });

        vtaas.message.on(vtaas.message.ELEMENT_SELECT_END, (event) => {
            this.hide();
        });
    }

    ElementSelector.prototype.show = function() {
        document.body.appendChild(this.rootElement);
        document.addEventListener('mousemove', this.mouseMoveHandler, true);
    };

    ElementSelector.prototype.hide = function() {
        document.removeEventListener('mousemove', this.mouseMoveHandler, true);
        if (this.rootElement.parentNode) {
            this.rootElement.parentNode.removeChild(this.rootElement);
        }
    };
}());

function initAfterDocumentReady() {
    console.log('initAfterDocumentReady() begin', document.readyState);
    vtaas.ui.elementSelector = new vtaas.ui.ElementSelector();

    if (!vtaas.utils.isIframe()) {

        vtaas.message.on(vtaas.message.FLOATPANEL_DISPLAY_CHANGED, (msg) => {
            if (msg.display === 'show') {
                vtaas.utils.createControlPanelDialog();
            } else {
                $('#vtaas-dialog-control-panel').remove();
            }
        });

        vtaas.message.on(vtaas.message.ELEMENT_SELECT_BEGIN, (event) => {
            vtaas.utils.createElementSelectorPathDialog();
        });

        vtaas.message.on(vtaas.message.MSG_MOUSEOVER_RECORD, (msg) => {
            let mouseoverMessage = 'MouseOver recording OFF';
            if (msg.mouseOverOn) {
                mouseoverMessage = 'MouseOver recording ON';
            }
            vtaas.messagePort.broadcast(vtaas.message.MSG_SHOW_ALERT, {message: mouseoverMessage});
        });

        vtaas.message.on(vtaas.message.MSG_CONTROLPANEL_SHOW, (event) => {
            //vtaas.utils.displayElement("#vtaas-dialog-control-panel", true);
            $("#vtaas-dialog-control-panel").css("visibility", "visible");
        });
    }

    //get current status from background
    chrome.runtime.sendMessage({action: "get_status"}, function(response) {
        vtaas.state.server = response.state.server;
        vtaas.state.port = response.state.port;
        vtaas.state.testcaseUuid = response.state.testcaseUuid;
        vtaas.state.role = response.state.role;
        vtaas.state.floatPanelDisplay = response.state.floatPanelDisplay;
        vtaas.state.status = response.state.status;
        vtaas.state.product = response.state.product;
        vtaas.state.testType = response.state.testType;
        vtaas.state.workersNumber = response.state.workersNumber;
        vtaas.state.mouseOverOn = response.state.mouseOverOn;
        vtaas.state.accessibilityEnabled = response.state.accessibilityEnabled;
        vtaas.state.accessibilityUser = response.state.accessibilityUser;
        vtaas.state.accessibilityPassword = response.state.accessibilityPassword;
        console.log('State at startup', vtaas.state);

        if (vtaas.utils.isLeader()) {
            import('/src/cs/content-utils.js').then(module => {
                vtaas.contentUtils = module;
            }).catch(err => {
                console.error('Load module failed: /src/cs/content-utils.js', err.message);
            });

            if (!vtaas.utils.isIframe()) {
                if (vtaas.state.workersNumber > 0) {

                    chrome.storage.local.get({'vtaasReplayStatusVisible': true}, (result) => {
                        vtaas.utils.createReplayProgressDialog(result.vtaasReplayStatusVisible);
                    });
                }

                if (vtaas.state.floatPanelDisplay == 'show') {
                    vtaas.utils.createControlPanelDialog();
                }
                vtaas.ui.notification = vtaas.utils.createNotificationDialog();
            }
        }

        if (vtaas.utils.isWorker()) {
            import('/src/cs/content-worker.js').then(module => {
                vtaas.contentWorker = module;
            }).catch(err => {
                console.error('Load module failed: /src/cs/content-worker.js', err.message);
            });
        }
    });
}

// Register it to run after document ready
//$(initAfterDocumentReady());
if (document.readyState === 'loading') {
    document.addEventListener('readystatechange', event => {
        if (event.target.readyState === 'interactive') {
            initAfterDocumentReady();
        }
    });
} else {
    initAfterDocumentReady();
}

vtaas.messagePort.init();


vtaas.message.on(vtaas.message.STATUS_CHANGED, (msg) => {
    if (msg.status === vtaas.constant.STATUS_STOP) {
        recorder.stop();
    }
});

async function accessibilityCheck() {
    TestRecorder.AccessibilityEvent.create().record();

    let pageText = {};
    vtaas.messagePort.broadcast(vtaas.message.MSG_SHOW_ALERT, {message: "Accessibility checking invoked."});
    let response = await vtaas.contentUtils.contentUtils.cacheAccessibilityPageInBackground(pageText);
    //vtaas.messagePort.broadcast(vtaas.message.MSG_SHOW_ALERT, {message: "Accessibility checking done."});
    console.log('Save webpage content response: ', response);
}

// browser window message handler
if (!vtaas.utils.isIframe()) {
    function messageHandler(event) {
        console.log('Received window.message event', event);
        if (event.data.type === 'DIALOG_HIDE') {
            vtaas.utils.displayElement($('#'+ event.data.dialogId), false);
        } else if (event.data.type === 'DIALOG_SHOW') {
            vtaas.utils.displayElement($('#'+ event.data.dialogId), true);
        } else if (event.data.type === 'DIALOG_CREATE') {
            if (event.data.dialogId === 'vtaas-dialog-text-resource') {
                vtaas.utils.createTextResourceDialog();
            } else if (event.data.dialogId === 'vtaas-dialog-assertion') {
                vtaas.utils.createAssertionDialog();
            } else if (event.data.dialogId === 'vtaas-dialog-screenshot') {
                vtaas.utils.createScreenshotDialog();
            } else if (event.data.dialogId === 'vtaas-dialog-configuration') {
                vtaas.utils.createConfigurationDialog();
            } else if (event.data.dialogId === 'vtaas-dialog-execution') {
                vtaas.utils.createExecutionDialog();
            }
        } else if (event.data.type === 'DIALOG_DESTROY') {
            $('#'+ event.data.dialogId).remove();
            if (event.data.dialogId !== 'vtaas-dialog-elementselectorpath') {
                vtaas.utils.resumeAfterOperation();
            }
        } else if (event.data.type === 'DIALOG_RESIZE') {
            $('#'+ event.data.dialogId).width(event.data.width);
            $('#'+ event.data.dialogId).height(event.data.height);
        } else if (event.data.type === 'DIALOG_SET_SIZE') {
            $('#'+ event.data.dialogId).width(event.data.width);
            $('#'+ event.data.dialogId).height(event.data.height);
        } else if (event.data.type === 'CHECK_ACCESSIBILITY') {
            accessibilityCheck();
        } else if (event.data.type === 'RECORD_EVENT') {
            if (event.data.recordType === 'screenshot') {
                //vtaas.utils.displayElement("#vtaas-dialog-control-panel", false);
                //$("#vtaas-dialog-control-panel").css("visibility", "hidden");
                $('#vtaas-dialog-control-panel').remove();
                vtaas.messagePort.broadcast(vtaas.message.FLOATPANEL_DISPLAY_CHANGED, 'hide');
                function captureScreenshot(data) {
                    if ($('#vtaas-dialog-screenshot').length === 0 &&
                            document.getElementById('vtaas-dialog-screenshot') === null &&
                            document.getElementById('vtaas-dialog-control-panel') === null) {
                        vtaas.eventRecord.saveScreenshotEvent(data);
                    } else {
                        window.setTimeout(captureScreenshot, 500, data);
                    }
                }
                window.setTimeout(captureScreenshot, 500, event.data.eventData);
            } else if (event.data.recordType === 'assert') {
                vtaas.eventRecord.saveAssertEvent(event.data.eventData);
            } else if (event.data.recordType === 'execute') {
                TestRecorder.ExecuteEvent.create(event.data.eventData.commandName).record();
            }
        } else if (event.data.type === 'DIALOG_SET_POSITION') {
            if (event.data.left !== null) {
                if (event.data.left === 'center') {
                    let left = (($(window).width() - $('#'+ event.data.dialogId).width()) / 2)  + 'px';
                    event.data.left = left;
                }
                $('#'+ event.data.dialogId).css('left', event.data.left);
            }
            if (event.data.top !== null) {
                if (event.data.top === 'center') {
                    let top = (($(window).height() - $('#'+ event.data.dialogId).height()) / 2)  + 'px';
                    event.data.top = top;
                }
                $('#'+ event.data.dialogId).css('top', event.data.top);
            }
            if (event.data.right !== null) {
                $('#'+ event.data.dialogId).css('right', event.data.right);
            }
            if (event.data.bottom !== null) {
                $('#'+ event.data.dialogId).css('bottom', event.data.bottom);
            }
        } else if (event.data.type === 'DIALOG_SET_CSS_VISIBILITY') {
            $('#'+ event.data.dialogId).css('visibility', event.data.visibility);
        }
    }
    window.addEventListener("message", messageHandler, false);
}

console.log('panel script end');