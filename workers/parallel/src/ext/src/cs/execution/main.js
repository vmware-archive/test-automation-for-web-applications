import {vtaasMessage} from '/src/cs/content-message.js';
import {contentUtils, FrameDialog, RuntimeState, postServerData} from '/src/cs/content-utils.js';

const ID_DIALOG = 'vtaas-dialog-execution';
const ID_MODAL = '#executionModal';

const ID_ALERT = '.alert';
const ID_COMMAND_DROPDOWN = '#sshCommand';
let product = null;

function showAlert(msg) {
    $('#alertPlaceholder').html(`
        <div class="alert alert-danger" role="alert">
            <p id="alertMessage"></p>
            <button type="button" class="close" data-dismiss="alert" aria-label="Close">
                <span aria-hidden="true">&times;</span>
            </button>
        </div>
    `)
    $('#alertMessage').html(msg);
    $(ID_ALERT).alert();
    contentUtils.resizeDialogByContentSize(ID_DIALOG, '.modal-dialog .modal-content');

    $(ID_ALERT).on('closed.bs.alert', function () {
        contentUtils.resizeDialogByContentSize(ID_DIALOG, '.modal-dialog .modal-content');
    });
}

function findId(searchList, text) {
    let item = searchList.find(function(e) {
        return e.name === text;
    });
    if (item) {
        return item.id;
    }
    return -1;
}

async function init() {
    product = await RuntimeState.getProduct();
    //$(ID_ALERT).alert('dispose');

    contentUtils.resizeDialogByContentSize(ID_DIALOG, '.modal-dialog .modal-content');
}

$(ID_MODAL).modal({backdrop: false});
$(ID_MODAL).on('hide.bs.modal', function(event) {
    FrameDialog.destroy(ID_DIALOG);
});

let esOptions = {
    filter: false
}
$(ID_COMMAND_DROPDOWN).editableSelect(esOptions);

$('button#ok').on('click', async function() {
    let commandName = $(ID_COMMAND_DROPDOWN).val().trim();

    if (commandName.length === 0) {
        showAlert('Command Name is required.');
        return;
    }

    let eventData = {
        commandName: commandName.trim()
    };
    contentUtils.recordEvent('execute', eventData);

    $('#executionModal').modal('hide');
});

init();