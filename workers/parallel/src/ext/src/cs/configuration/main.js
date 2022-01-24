import {vtaasMessage} from '/src/cs/content-message.js';
import {contentUtils, FrameDialog, RuntimeState} from '/src/cs/content-utils.js';

const ID_DIALOG = 'vtaas-dialog-configuration';
const ID_MODAL = '#configurationModal';

const ID_SERVER_INPUT = '#serverInput';
const ID_PORT_INPUT = '#portInput';
const ID_TESTCASE_INPUT = '#testcaseInput';
const ID_ROLE_SELECT = '#roleSelect';
const ID_NON_ASCII_SELECT = '#nonAsciiSelect';
const ID_MOUSEOVER_INPUT = '#mouseoverInput';
const ID_REPLAY_STATUS_INPUT = '#replayStatusInput';

$(ID_MODAL).on('hide.bs.modal', function(event) {
    FrameDialog.destroy(ID_DIALOG);
});

$(ID_MODAL).on('shown.bs.modal', function (event) {
    chrome.runtime.sendMessage({action: "get_status"}, function(response) {
        $(ID_SERVER_INPUT).val(response.state.server);
        $(ID_PORT_INPUT).val(response.state.port);
        $(ID_TESTCASE_INPUT).val(response.state.testcaseUuid);
        $(ID_ROLE_SELECT).val(response.state.role);
    });

    RuntimeState.getMouseOverWaitTime().then((waitTime) => {
        $(ID_MOUSEOVER_INPUT).val(waitTime.toString());
    });

    chrome.storage.local.get({'vtaasDefaultNonAsciiString': "表ポあA中Œ鷗停B逍"}, (result) => {
        $(ID_NON_ASCII_SELECT).val(result.vtaasDefaultNonAsciiString);
    });

    chrome.storage.local.get({'vtaasReplayStatusVisible': true}, (result) => {
        $(ID_REPLAY_STATUS_INPUT).prop("checked", result.vtaasReplayStatusVisible);
    });
});

$('button#ok').on('click', function() {
    vtaasMessage.broadcast(vtaasMessage.CONFIG_CHANGED, {
        server: $(ID_SERVER_INPUT).val(),
        port: $(ID_PORT_INPUT).val(),
        testcaseUuid: $(ID_TESTCASE_INPUT).val(),
        role: $(ID_ROLE_SELECT).val()
    });

    let mouseOverWait = parseInt($(ID_MOUSEOVER_INPUT).val(), 10);
    RuntimeState.setMouseOverWaitTime(mouseOverWait).then((result) => {
        console.debug("Successfully update mouseover waiting time: )" + result);
    });

    chrome.storage.local.set({vtaasDefaultNonAsciiString: $(ID_NON_ASCII_SELECT).val()});

    let replayStatusVisible = $(ID_REPLAY_STATUS_INPUT).prop("checked");
    chrome.storage.local.set({vtaasReplayStatusVisible: replayStatusVisible});
    const REPLAY_PROGRESS_DIALOG_ID = 'vtaas-dialog-replay-progress';
    if (replayStatusVisible) {
        FrameDialog.show(REPLAY_PROGRESS_DIALOG_ID);
    } else {
        FrameDialog.hide(REPLAY_PROGRESS_DIALOG_ID);
    }

    $(ID_MODAL).modal('hide');
});

$(ID_MODAL).modal({backdrop: false});
contentUtils.resizeDialogByContentSize(ID_DIALOG, '.modal-dialog .modal-content');