import {vtaasMessage} from '/src/cs/content-message.js';
import {contentUtils, FrameDialog, RuntimeState} from '/src/cs/content-utils.js';

const ID_DIALOG = 'vtaas-dialog-text-resource';
const ID_MODAL = '#modal';
const ID_GRID = '#textResourcesGrid';

let currentRow = null;

$(ID_MODAL).modal({backdrop: false});

async function getTextResources() {
    let textResources = await RuntimeState.getTextResources();
    return textResources;
}

async function init() {
    let textResources = await getTextResources();
    let locale = await RuntimeState.getLocale();
    let localeTitle = locale.replace('_', '-');

    let columns = [
        { title: "Key", name: "key", type: "text", width: 150 },
        { title: localeTitle, name: locale, type: "text", width: 150 },
    ];

    $(ID_GRID).jsGrid({
        width: "100%",
        height: "400px",

        inserting: false,
        editing: false,
        sorting: true,
        paging: true,

        data: textResources,

        fields: columns,

        rowClick: function(args) {
            let selectedRow = $(ID_GRID).find('table tr.highlight');
            if (selectedRow.length) {
                selectedRow.toggleClass('highlight');
            };

            let $row = $(ID_GRID).jsGrid("rowByItem", args.item);
            $row.toggleClass("highlight");

            currentRow = args.item;
        },
    });

    contentUtils.resizeDialogByContentSize(ID_DIALOG, '.modal-dialog .modal-content');
}


$(ID_MODAL).on('hide.bs.modal', function(event) {
    FrameDialog.destroy(ID_DIALOG);
});

$('button#ok').on('click', function() {
    if (currentRow === null) {
        alert("No text resource is selected.");
        return;
    }
    let msg = {key: currentRow.key};
    vtaasMessage.broadcast(vtaasMessage.TEXT_RESOURCE_SELECTION, msg);
    $(ID_MODAL).modal('hide');
});

$('button#cancel').on('click', function() {
    let msg = {key: null};
    vtaasMessage.broadcast(vtaasMessage.TEXT_RESOURCE_SELECTION, msg);
    $(ID_MODAL).modal('hide');
});

init();