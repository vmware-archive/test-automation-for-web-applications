import {vtaasMessage} from '/src/cs/content-message.js';


let elementInfo = null;
$('#elementButton').on('click', (event) => {
    let msgData = {
        type: 'DIALOG_HIDE',
        dialogId: 'vtaas-dialog-screenshot'
    };
    window.top.postMessage(msgData, '*');

    let elementSelectHandler = (selectEvent) => {
        elementInfo = selectEvent;
        $('#vtaas-ss-element-textbox').val(selectEvent.xpath3);

        vtaasMessage.off(vtaasMessage.ELEMENT_SELECT_END, elementSelectHandler);

        let msgData = {
            type: 'DIALOG_SHOW',
            dialogId: 'vtaas-dialog-screenshot'
        };
        window.top.postMessage(msgData, '*');
    }
    vtaasMessage.on(vtaasMessage.ELEMENT_SELECT_END, elementSelectHandler);
    vtaasMessage.broadcast(vtaasMessage.ELEMENT_SELECT_BEGIN, undefined);
});

function displayElement(element, visible) {
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

function resizeDialog() {
    let height = $('#screenshotModal .modal-content').outerHeight(true);
    let width = $('#screenshotModal .modal-content').outerWidth(true);

    let msgData = {
        type: 'DIALOG_RESIZE',
        dialogId: 'vtaas-dialog-screenshot',
        height: height + 'px',
        width: width + 'px'
    };
    window.top.postMessage(msgData, '*');
}

function showElementSelection(event) {
    if ($('#element-area-radio').get(0) === event.target) {
        displayElement($('#element-select-row'), true);
        resizeDialog();
    } else if ($('#screen-area-radio').get(0) === event.target || $('#full-page-area-radio').get(0) === event.target) {
        displayElement($('#element-select-row'), false);
        resizeDialog();
    }
}

$('#element-area-radio').on('click', showElementSelection);
$('#screen-area-radio').on('click', showElementSelection);
$('#full-page-area-radio').on('click', showElementSelection);

$('#screenshotModal').on('hide.bs.modal', function(event) {
    let msgData = {
        type: 'DIALOG_DESTROY',
        dialogId: 'vtaas-dialog-screenshot'
    };
    window.top.postMessage(msgData, '*');
});

// Screen area type is default
displayElement($('#element-select-row'), false);

$('button#ok').on('click', function() {
    let eventData = null;
    let areaType = '';

    if ($('#element-area-radio').prop('checked')) {
        if (elementInfo === null) {
            alert('Select an element.');
            return;
        }
        areaType = 'element';
        eventData = {
            name: $('#screenshot-name').val(),
            xpath: elementInfo.xpath,
            xpath2: elementInfo.xpath2,
            xpath3: elementInfo.xpath3,
            selector: elementInfo.selector,
            verify_type: elementInfo.verify_type,
            verify_value: elementInfo.verify_value,
            id: elementInfo.id,
            extraData: JSON.stringify({
                areaType: areaType
            })
        }

    } else {
        areaType = 'screen';
        if ($('#full-page-area-radio').prop('checked')) {
            areaType = 'fullpage';
        }
        eventData = {
            name: $('#screenshot-name').val(),
            xpath: '',
            xpath2: '',
            selector: '',
            id: '',
            extraData: JSON.stringify({
                areaType: areaType
            })
        }
    }

    let msgData = {
        type: 'RECORD_EVENT',
        recordType: 'screenshot',
        eventData: eventData
    };
    window.top.postMessage(msgData, '*');
    //

    chrome.storage.local.set({vtaasScreenshotAreaType: areaType});

    $('#screenshotModal').modal('hide');
});

$('#screenshotModal').on('shown.bs.modal', function (event) {
    $('#screenshot-name').get(0).focus();
    //resizeDialog();

    chrome.storage.local.get(['vtaasScreenshotAreaType'], (result) => {
        if (result.vtaasScreenshotAreaType === undefined) {
            return;
        }
        if (result.vtaasScreenshotAreaType === 'element') {
            $('#element-area-radio').trigger('click');
        } else {
            $('#screen-area-radio').trigger('click');
        }
    });
});

$('#screenshotModal').modal({backdrop: false});