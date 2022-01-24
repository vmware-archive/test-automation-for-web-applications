import {vtaasMessage} from '/src/cs/content-message.js';
import {contentUtils, FrameDialog, RuntimeState} from '/src/cs/content-utils.js';

const ID_DIALOG = 'vtaas-dialog-elementselectorpath';
const ID_PATH_VALUE = '#pathValue';

vtaasMessage.on(vtaasMessage.ELEMENT_SELECT_END, (event) => {
    FrameDialog.destroy(ID_DIALOG);
});

vtaasMessage.on(vtaasMessage.ELEMENT_SELECT_CHANGED, (event) => {
    $(ID_PATH_VALUE).text(event.xpath);
    contentUtils.resizeDialogByContentSize(ID_DIALOG, '.path-container');
});