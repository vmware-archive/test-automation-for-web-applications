import {vtaasMessage} from '/src/cs/content-message.js';
import {contentUtils, FrameDialog} from '/src/cs/content-utils.js';

const ID_DIALOG = 'vtaas-dialog-control-panel';
const ID_CONTROL_PANEL = '.vtaas-control-panel';
const ID_PANEL_CONTAINER = '.vtaas-panel-container';

let rootElement = null;

let allButtons = {
    assertButton: null,
    mouseOverButton: null,
    startButton: null,
    pauseButton: null,
    resumeButton: null,
    stopButton: null,
    fileBugButton: null,
    captureScreenButton: null,
    accessibilityButton: null,
    settingsButton: null,
};

let mouseMoveHandler = null;
let testType = null;

let operationInProgress = false;


let vtaas = {
    constant: {
        STATUS_RUN: 'run',
        STATUS_PAUSE: 'pause',
        STATUS_STOP: 'stop',
    },
    state: {
        status: null,
        statusPrevious: null
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
    }
};
vtaas.state.status = vtaas.constant.STATUS_STOP;
let mouseOverOn = false;

vtaas.utils.pauseBeforeOperation = function() {
    if (vtaas.utils.isRunning()) {
        vtaasMessage.broadcast(vtaasMessage.STATUS_CHANGED, {status: vtaas.constant.STATUS_PAUSE});
    } else {
        vtaas.state.statusPrevious = null;
    }
};

function initUi() {
    function copyNonAsciiToClipboard() {
        chrome.storage.local.get({'vtaasDefaultNonAsciiString': "表ポあA中Œ鷗停B逍"}, (result) => {
            let textElement = $("<div/>", {
                text: result.vtaasDefaultNonAsciiString
            });
            //textElement.css("visibility", "hidden");
            textElement.appendTo("body");
            //textElement.appendTo("vtaas-panel-container");

            let range = document.createRange();
            range.selectNode(textElement.get(0));
            window.getSelection().removeAllRanges();
            window.getSelection().addRange(range);

            let execResult = document.execCommand('copy');
            if (!execResult) {
                alert("Can not copy Non-ascii string");
            }
            window.getSelection().removeAllRanges();
            textElement.remove();
        });
    }

    function setButtonOnState(button, isOn) {
        if (isOn) {
            $(button).addClass("vtaas-button-on");
        } else {
            $(button).removeClass("vtaas-button-on");
        }
    }

    function changeMouseoverState() {
        mouseOverOn = !mouseOverOn;
        setButtonOnState(allButtons.mouseOverButton.wrappedButton, mouseOverOn);
        vtaasMessage.broadcast(vtaasMessage.MSG_MOUSEOVER_RECORD, {mouseOverOn: mouseOverOn});
    }

    let buttons = [
        {
            id: "assert",
            title: "Assert",
            icon: vtaasImages.assert,
            onclick: function() {
                if (operationInProgress) {
                    return;
                }
                operationInProgress = true;
                vtaas.utils.pauseBeforeOperation();
                FrameDialog.create('vtaas-dialog-assertion');
            }
        },
        {
            id: "execute",
            title: "Execute",
            icon: vtaasImages.execute,
            onclick: function() {
                if (operationInProgress) {
                    return;
                }
                operationInProgress = true;
                vtaas.utils.pauseBeforeOperation();
                FrameDialog.create('vtaas-dialog-execution');
            }
        },
        {
            id: "mouseOver",
            title: "Mouseover",
            icon: vtaasImages.mouseOver,
            onclick: function() {
                if (operationInProgress) {
                    return;
                }
                changeMouseoverState();
                //vtaas.utils.pauseBeforeOperation();
                //FrameDialog.create('vtaas-dialog-execution');
            }
        },
        {
            id: "start",
            title: "Start",
            icon: vtaasImages.start,
            onclick: (event) => {
                chrome.runtime.sendMessage({action: "start"}, (response) => {
                    // if (response.success) {

                    // }
                });
            }
        },
        {
            id: "pause",
            title: "Pause",
            icon: vtaasImages.pause,
            onclick: function() {
                chrome.runtime.sendMessage({action: "pause"});
            }
        },
        {
            id: "resume",
            title: "Resume",
            icon: vtaasImages.resume,
            onclick: function() {
                chrome.runtime.sendMessage({action: "resume"});
            }
        },
        {
            id: "stop",
            title: "Stop",
            icon: vtaasImages.stop,
            onclick: function() {
                chrome.runtime.sendMessage({action: "stop"});
            }
        },
        {
            id: "fileBug",
            title: "File bug",
            icon: vtaasImages.fileBug,
            onclick: function() {
                chrome.runtime.sendMessage({action: 'report_issue', message: ''});
            }
        },
        {
            id: "copy",
            title: "Non-Ascii",
            tooltip: "Copy Non-ascii string to clipboard",
            icon: vtaasImages.copy,
            onclick: function() {
                copyNonAsciiToClipboard();
            }
        },
        {
            id: "captureScreen",
            title: "Capture",
            icon: vtaasImages.captureScreen,
            onclick: function() {
                if (operationInProgress) {
                    return;
                }
                operationInProgress = true;
                vtaas.utils.pauseBeforeOperation();
                FrameDialog.create('vtaas-dialog-screenshot');
            }
        },
        {
            id: "accessibility",
            title: "Accessibility",
            icon: vtaasImages.accessibility,
            onclick: function() {
                contentUtils.checkAccessibility();
            }
        },
        {
            id: "settings",
            title: "Settings",
            icon: vtaasImages.settings,
            onclick: function() {
                if (operationInProgress) {
                    return;
                }
                operationInProgress = true;
                vtaas.utils.pauseBeforeOperation();
                FrameDialog.create('vtaas-dialog-configuration');
            }
        }
    ]

    rootElement = $(ID_CONTROL_PANEL)[0];
    rootElement.addEventListener('selectstart', function(event){
        event.stopPropagation();
        event.preventDefault();
    }, true);

    // {
    //     let diffX = 0, diffY = 0;
    //     let isDrag = false, movedCount = 0;

    //     this.rootElement.addEventListener('mousedown', (event) => {
    //         diffX = event.clientX - this.rootElement.offsetLeft;
    //         diffY = event.clientY - this.rootElement.offsetTop;
    //         isDrag = true;
    //     }, true);

    //     this.mouseMoveHandler = (event) => {
    //         if(isDrag && event.clientX > 0 && event.clientY > 0){
    //             movedCount = movedCount + 1;
    //             event.stopPropagation();
    //             event.preventDefault();
    //             this.rootElement.style.left = event.clientX - diffX + 'px';
    //             this.rootElement.style.top = event.clientY - diffY + 'px';
    //             this.rootElement.style.bottom = 'auto';
    //             this.rootElement.style.right = 'auto';
    //         }
    //     }
    //     document.addEventListener('mousemove', this.mouseMoveHandler, true);

    //     this.rootElement.addEventListener('mouseup', (event) => {
    //         if(movedCount > 1){
    //             event.stopPropagation();
    //             event.preventDefault();
    //         }
    //         isDrag = false;
    //     }, true);

    //     this.rootElement.addEventListener('click', (event) => {
    //         if(movedCount > 1){
    //             event.stopPropagation();
    //             event.preventDefault();
    //         }
    //         movedCount = 0;
    //     }, true);

    // }

    for (let b of buttons) {
        addPanelButton(b);
    }

    chrome.runtime.sendMessage({action: "get_status"}, function(response) {
        vtaas.state.status = response.state.status;
        testType = response.state.testType;
        let accessibilityEnabled = response.state.accessibilityEnabled;
        if (testType === 'parallel') {
            allButtons.assertButton.hide();
        } else {
            allButtons.fileBugButton.hide();
        }
        if (!accessibilityEnabled) {
            allButtons.accessibilityButton.hide();
        }
        setStatusButtonVisible(response.state.status);

        mouseOverOn = response.state.mouseOverOn;
        setButtonOnState(allButtons.mouseOverButton.wrappedButton, mouseOverOn);
    });
};

function setStatusButtonVisible(status) {
    if (status === vtaas.constant.STATUS_RUN) {
        allButtons.startButton.hide();
        allButtons.resumeButton.hide();
        allButtons.pauseButton.show();
        allButtons.stopButton.show();
    } else if (status === vtaas.constant.STATUS_PAUSE) {
        allButtons.startButton.hide();
        allButtons.resumeButton.show();
        allButtons.pauseButton.hide();
        allButtons.stopButton.show();
    } else if (status === vtaas.constant.STATUS_STOP) {
        allButtons.startButton.show();
        allButtons.resumeButton.hide();
        allButtons.pauseButton.hide();
        allButtons.stopButton.hide();
    }

    setWindowSize();
    positionWindow();
};

// ControlPanelEx.prototype.close = function() {
//     document.removeEventListener('mousemove', mouseMoveHandler, true);

//     rootElement = null;
// };

function addPanelButton(command) {
    const buttonHtml = [
        '<button class="vtaas-panel-button" title="' + (command.tooltip ? command.tooltip : "") + '">',
            '<div class="vtaas-button-inner">',
                '<div class="vtaas-button-icon">',
                    command.icon,
                '</div>',
                '<div class="vtaas-button-title">' + command.title + '</div>',
            '</div>',
        '</button>'
    ].join('');

    let wrappedButton = $.parseHTML(buttonHtml)[0];
    $('.vtaas-panel-button.vtaas-panel-padder', rootElement).get(1).before(wrappedButton);
    wrappedButton.addEventListener('click', command.onclick);
    let buttonId = command.id + 'Button';
    allButtons[buttonId] = {
        wrappedButton: wrappedButton,
        display: wrappedButton.style.display,
        show: function() {
            this.wrappedButton.style.display = this.display;
        },
        hide: function() {
            this.wrappedButton.style.display = 'none';
        }
    }

};

function setWindowSize() {
    let height = $(ID_PANEL_CONTAINER).outerHeight(true) + 'px';
    let width = $(ID_PANEL_CONTAINER).outerWidth(true) + 1 + 'px';
    FrameDialog.setSize(ID_DIALOG, width, height);
}

function positionWindow() {
    let left = 'center';
    let bottom = 10 + 'px';
    FrameDialog.setPosition(ID_DIALOG, left, null, null, bottom);
};

initUi();

$(ID_CONTROL_PANEL).on('mouseenter', (event) => {
    $(ID_CONTROL_PANEL).addClass('vtaas-hover');
});

$(ID_CONTROL_PANEL).on('mouseleave', (event) => {
    $(ID_CONTROL_PANEL).removeClass('vtaas-hover');
});

vtaasMessage.on(vtaasMessage.STATUS_CHANGED, (msg) => {
    vtaas.state.status = msg.status;
    setStatusButtonVisible(msg.status);
    if (msg.status === vtaas.constant.STATUS_RUN) {
        operationInProgress = false;
    }
});

vtaasMessage.on(vtaasMessage.MSG_MOUSEOVER_RECORD, (msg) => {
    mouseOverOn = msg.mouseOverOn;
});

//setWindowSize();
//positionWindow();
// setTimeout(function() {
//     FrameDialog.setCssVisibility(ID_DIALOG, 'visible');
// }, 1000);