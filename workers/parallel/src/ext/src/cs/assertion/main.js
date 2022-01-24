import {vtaasMessage} from '/src/cs/content-message.js';
import {contentUtils, FrameDialog} from '/src/cs/content-utils.js';

const ID_DIALOG = 'vtaas-dialog-assertion';
const ID_DIALOG_TEXT_RESOURCE = 'vtaas-dialog-text-resource';
const ID_MODAL = '#assertionModal';
const ID_ELEMENT_TEXTBOX = '#assertElement';
const ID_ASSERTION_TYPE = '#assertionType';
const ID_EXPECTED_TYPE = '#expectedType';
const ID_EXPECTED_RESOURCE_TEXTBOX = '#expectedValueResource';

const TYPE_VALUE = "value";
const TYPE_TEXT = "text";
const TYPE_DISPLAYED = "displayed";
const TYPE_ENABLED = "enabled";
const TYPE_SELECTED = "selected";

const OPERATOR_EQUAL = "equal";
const OPERATOR_NOT_EQUAL = "notEqual";
const OPERATOR_INCLUDE = "include";
const OPERATOR_NOT_INCLUDE = "notInclude";
const OPERATOR_IS_ABOVE = "isAbove";
const OPERATOR_IS_BELOW = "isBelow";
const OPERATOR_MATCH = "match";
const OPERATOR_NOT_MATCH = "notMatch";

const ID_OPERATOR_OPTION_EQUAL = `#assertionOperator option[value='${OPERATOR_EQUAL}']`;
const ID_OPERATOR_OPTION_NOT_EQUAL = `#assertionOperator option[value='${OPERATOR_NOT_EQUAL}']`;
const ID_OPERATOR_OPTION_INCLUDE = `#assertionOperator option[value='${OPERATOR_INCLUDE}']`;
const ID_OPERATOR_OPTION_NOT_INCLUDE = `#assertionOperator option[value='${OPERATOR_NOT_INCLUDE}']`;
const ID_OPERATOR_OPTION_IS_ABOVE = `#assertionOperator option[value='${OPERATOR_IS_ABOVE}']`;
const ID_OPERATOR_OPTION_IS_BELOW = `#assertionOperator option[value='${OPERATOR_IS_BELOW}']`;
const ID_OPERATOR_OPTION_MATCH = `#assertionOperator option[value='${OPERATOR_MATCH}']`;
const ID_OPERATOR_OPTION_NOT_MATCH = `#assertionOperator option[value='${OPERATOR_NOT_MATCH}']`;

let elementInfo = null;

$('#elementButton').on('click', (event) => {
    let msgData = {
        type: 'DIALOG_HIDE',
        dialogId: ID_DIALOG
    };
    window.top.postMessage(msgData, '*');

    let elementSelectHandler = (selectEvent) => {
        elementInfo = selectEvent;
        $(ID_ELEMENT_TEXTBOX).val(selectEvent.xpath3);
        $(ID_ELEMENT_TEXTBOX).trigger('input');

        vtaasMessage.off(vtaasMessage.ELEMENT_SELECT_END, elementSelectHandler);

        let msgData = {
            type: 'DIALOG_SHOW',
            dialogId: ID_DIALOG
        };
        window.top.postMessage(msgData, '*');
    }
    vtaasMessage.on(vtaasMessage.ELEMENT_SELECT_END, elementSelectHandler);
    vtaasMessage.broadcast(vtaasMessage.ELEMENT_SELECT_BEGIN, undefined);
});

$('#expectedResourceButton').on('click', (event) => {
    FrameDialog.hide(ID_DIALOG);

    let resourceSelectHandler = (selectEvent) => {
        if (selectEvent.key !== null) {
            $(ID_EXPECTED_RESOURCE_TEXTBOX).val(selectEvent.key);
        }
        vtaasMessage.off(vtaasMessage.TEXT_RESOURCE_SELECTION, resourceSelectHandler);
        FrameDialog.show(ID_DIALOG);
    }
    vtaasMessage.on(vtaasMessage.TEXT_RESOURCE_SELECTION, resourceSelectHandler);
    FrameDialog.create(ID_DIALOG_TEXT_RESOURCE);
});

$('button#ok').on('click', function() {
    let sleep = parseInt($('#delayTime').val(), 10);
    if (isNaN(sleep)) {
        alert('The sleep value is not valid.');
        return;
    }
    let type = $(ID_ASSERTION_TYPE).val();
    let operator = $('#assertionOperator').val();
    let expectType = $(ID_EXPECTED_TYPE).val();
    let expect = '';

    if (!elementInfo) {
        alert('Select an element to assert.');
        return;
    }

    let modifiedXpath3 = $(ID_ELEMENT_TEXTBOX).val();
    if (modifiedXpath3 !== elementInfo.xpath3) {
        elementInfo.xpath2 = modifiedXpath3;
        elementInfo.xpath3 = modifiedXpath3;
        elementInfo.xpath4 = '';
        elementInfo.xpath = modifiedXpath3;
        elementInfo.selector = '';
    }

    if (expectType === 'string') {
        expect = $('#expectedValueString').val();
    } else if (expectType === 'boolean') {
        if ($('#expectedValueBooleanTrue').prop("checked")) {
            expect = 'true';
        } else if ($('#expectedValueBooleanFalse').prop("checked")) {
            expect = 'false';
        } else {
            alert('Select one of two explected boolean values.');
            return;
        }
    } else if (expectType === 'resource') {
        expect = '$${{' + $(ID_EXPECTED_RESOURCE_TEXTBOX).val() + '}}';
    }

    switch(type){
        case TYPE_DISPLAYED:
        case TYPE_ENABLED:
        case TYPE_SELECTED:
            if (/^(true|True|TRUE)$/.test(expect)) {
                expect = true;
            } else if (/^(false|False|FALSE)$/.test(expect)) {
                expect = false;
            } else {
                alert('Valid expected values are "true" or "false".');
                return;
            }
            break;
        case TYPE_TEXT:
            if (isEditableElement(elementInfo.tagName)) {
                type = TYPE_VALUE;
            }
            break;
        default:
            break;
    }
    // try{
    //     switch(operator){
    //         case OPERATOR_EQUAL:
    //         case OPERATOR_NOT_EQUAL:
    //             /^(true|false)$/.test(expect)?eval(expect):eval('\`'+expect+'\`');
    //             break;
    //         case OPERATOR_MATCH:
    //         case OPERATOR_NOT_MATCH:
    //             eval(expect);
    //             break;
    //         default:
    //             eval('\`'+expect+'\`');
    //             break;
    //     }
    // } catch(e){
    //     return alert(e);
    // }
    let jsonData = {
        sleep: sleep || 30000,
        type: type,
        operator: operator,
        expect: expect
    }
    let expectData = {
        text: elementInfo.text,
        class: elementInfo.class,
        value: elementInfo.value,
        id: elementInfo.id,
        obj_left: elementInfo.obj_left,
        obj_top: elementInfo.obj_top,
        obj_right: elementInfo.obj_right,
        obj_bottom: elementInfo.obj_bottom,
        obj_scrolltop: elementInfo.obj_scrolltop,
        obj_scrollleft: elementInfo.obj_scrollleft,
        xpath: elementInfo.xpath,
        xpath2: elementInfo.xpath2,
        xpath3: elementInfo.xpath3,
        xpath4: elementInfo.xpath4,
        selector: elementInfo.selector,
        verify_type: elementInfo.verify_type,
        verify_value: elementInfo.verify_value,
        jsonData: JSON.stringify(jsonData)
    };

    let msgData = {
        type: 'RECORD_EVENT',
        recordType: 'assert',
        eventData: expectData
    };
    window.top.postMessage(msgData, '*');

    $(ID_MODAL).modal('hide');
});

$(ID_MODAL).on('hide.bs.modal', function(event) {
    let msgData = {
        type: 'DIALOG_DESTROY',
        dialogId: ID_DIALOG
    };
    window.top.postMessage(msgData, '*');
});

function isEditableElement(tagName) {
    tagName = tagName.toUpperCase();
    if (tagName === 'INPUT' || tagName === 'SELECT' || tagName === 'TEXTAREA') {
        return true;
    }
    return false;
}

function refreshExpectedValue() {
    if ($('#expectedValueString').val() && $('#expectedValueString').val().trim().length > 0) {
        return;
    }
    let type = $(ID_ASSERTION_TYPE).val();

    if (elementInfo) {
        let prop = '';
        if (type === TYPE_TEXT) {
            if (isEditableElement(elementInfo.tagName)) {
                prop = elementInfo.value;
            } else {
                prop = elementInfo.text;
            }
        }
        if (prop) {
            $('#expectedValueString').val(prop);
        }
    }
}

$(ID_ASSERTION_TYPE).change(function() {
    let type = $(ID_ASSERTION_TYPE).val();

    switch(type){
        case TYPE_DISPLAYED:
        case TYPE_ENABLED:
        case TYPE_SELECTED:
            contentUtils.displayElement(ID_OPERATOR_OPTION_INCLUDE, false);
            contentUtils.displayElement(ID_OPERATOR_OPTION_NOT_INCLUDE, false);
            contentUtils.displayElement(ID_OPERATOR_OPTION_IS_ABOVE, false);
            contentUtils.displayElement(ID_OPERATOR_OPTION_IS_BELOW, false);
            contentUtils.displayElement(ID_OPERATOR_OPTION_MATCH, false);
            contentUtils.displayElement(ID_OPERATOR_OPTION_NOT_MATCH, false);
            if ($('#assertionOperator').val() !== OPERATOR_EQUAL ||
            $('#assertionOperator').val() !== OPERATOR_NOT_EQUAL) {
                $('#assertionOperator').val(OPERATOR_EQUAL);
            }

            $(ID_EXPECTED_TYPE).val('boolean');
            break;
        default:
            contentUtils.displayElement(ID_OPERATOR_OPTION_INCLUDE, true);
            contentUtils.displayElement(ID_OPERATOR_OPTION_NOT_INCLUDE, true);
            contentUtils.displayElement(ID_OPERATOR_OPTION_IS_ABOVE, true);
            contentUtils.displayElement(ID_OPERATOR_OPTION_IS_BELOW, true);
            contentUtils.displayElement(ID_OPERATOR_OPTION_MATCH, true);
            contentUtils.displayElement(ID_OPERATOR_OPTION_NOT_MATCH, true);

            $(ID_EXPECTED_TYPE).val('string');
            break;
    }

    $(ID_EXPECTED_TYPE).trigger('change');
    refreshExpectedValue();
});

$(ID_EXPECTED_TYPE).change(function() {
    let expectedType = $(ID_EXPECTED_TYPE).val();
    switch(expectedType){
        case 'string':
            contentUtils.displayElement('#expectedValueBooleanPanel', false);
            contentUtils.displayElement('#expectedValueStringPanel', true);
            contentUtils.displayElement('#expectedValueTextResourcePanel', false);
            break;
        case 'boolean':
            contentUtils.displayElement('#expectedValueBooleanPanel', true);
            contentUtils.displayElement('#expectedValueStringPanel', false);
            contentUtils.displayElement('#expectedValueTextResourcePanel', false);
            break;
        case 'resource':
            contentUtils.displayElement('#expectedValueBooleanPanel', false);
            contentUtils.displayElement('#expectedValueStringPanel', false);
            contentUtils.displayElement('#expectedValueTextResourcePanel', true);
            break;
        default:
            break;
    }
    contentUtils.resizeDialogByContentSize(ID_DIALOG, '.modal-dialog .modal-content');
});

$(ID_ELEMENT_TEXTBOX).on('input', function(event) {
    refreshExpectedValue();
});

$(ID_MODAL).modal({backdrop: false});

$('#delayTime').val('30000');
$(ID_ASSERTION_TYPE).val(TYPE_TEXT);
$(ID_ASSERTION_TYPE).trigger('change');
$('#assertionOperator').val(OPERATOR_EQUAL);
$(ID_EXPECTED_TYPE).val('string');

refreshExpectedValue();

