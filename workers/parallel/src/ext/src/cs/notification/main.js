import {contentUtils, FrameDialog, RuntimeState, postServerData} from '/src/cs/content-utils.js';
import {vtaasMessage} from '/src/cs/content-message.js';

const ID_DIALOG = 'vtaas-dialog-notification';

let alertCount = 0;
let alertIndex = 0;
function generateHtml(message) {
    let alertHtml = `<div class="alert alert-success">
    <div class="alert-items">
      <div class="alert-item static">
        <div class="alert-icon">
          <svg version="1.1" class="has-solid " viewBox="0 0 36 36" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" focusable="false" role="img">
            <path class="clr-i-outline clr-i-outline-path-1" d="M18,6A12,12,0,1,0,30,18,12,12,0,0,0,18,6Zm0,22A10,10,0,1,1,28,18,10,10,0,0,1,18,28Z"></path>
            <path class="clr-i-outline clr-i-outline-path-2" d="M16.34,23.74l-5-5a1,1,0,0,1,1.41-1.41l3.59,3.59,6.78-6.78a1,1,0,0,1,1.41,1.41Z"></path>
            <path class="clr-i-solid clr-i-solid-path-1" d="M30,18A12,12,0,1,1,18,6,12,12,0,0,1,30,18Zm-4.77-2.16a1.4,1.4,0,0,0-2-2l-6.77,6.77L13,17.16a1.4,1.4,0,0,0-2,2l5.45,5.45Z"></path>
          </svg>
        </div>
        <span class="alert-text">${message}</span>
      </div>
    </div>
    <button id="closeButton-${++alertIndex}" aria-label="Close" class="close" type="button">
      <svg version="1.1" viewBox="0 0 36 36" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" focusable="false" role="img">
        <path class="clr-i-outline clr-i-outline-path-1" d="M19.41,18l8.29-8.29a1,1,0,0,0-1.41-1.41L18,16.59,9.71,8.29A1,1,0,0,0,8.29,9.71L16.59,18,8.29,26.29a1,1,0,1,0,1.41,1.41L18,19.41l8.29,8.29a1,1,0,0,0,1.41-1.41Z"></path>
      </svg>
    </button>
    </div>`;
    return alertHtml;
}

// function updateUi() {
//   contentUtils.resizeDialogByContentSize(ID_DIALOG, '.dialog-container');
//   if (alertCount === 0) {
//     FrameDialog.hide(ID_DIALOG);
//   }
// }

function closeHandlerBuilder(context) {
    return function() {
        alertCount--;
        if (context.timeoutId !== -1) {
          clearTimeout(context.timeoutId);
        }
        $(context.closeSelector).off('click', context.closeHandler);
        $(context.alertElement).remove();
        contentUtils.resizeDialogByContentSize(ID_DIALOG, '.dialog-container');
        // if (alertCount === 0) {
        //   FrameDialog.hide(ID_DIALOG);
        // }
    };
}

function addAlert(message) {
    alertCount++;
    let context = {
      timeoutId: -1,
      alertElement: null,
      closeHandler: null,
    }
    context.alertElement = $.parseHTML(generateHtml(message))[0];
    context.closeSelector = `#closeButton-${alertIndex}`;
    context.closeHandler = closeHandlerBuilder(context);
    $(".dialog-container").append(context.alertElement);
    $(context.closeSelector).on('click', function() {
      context.closeHandler();
    });

    // if (alertCount === 1) {
    //   FrameDialog.show(ID_DIALOG);
    //   setTimeout(function() {
    //     contentUtils.resizeDialogByContentSize(ID_DIALOG, '.dialog-container');
    //   }, 1 * 1000);
    // }
    contentUtils.resizeDialogByContentSize(ID_DIALOG, '.dialog-container');

    context.timeoutId = setTimeout(function() {
      context.timeoutId = -1;
      context.closeHandler();
    }, 5 * 1000);
}

vtaasMessage.on(vtaasMessage.MSG_SHOW_ALERT, function(data) {
    addAlert(data.message);
});

contentUtils.resizeDialogByContentSize(ID_DIALOG, '.dialog-container');
// if (alertCount === 0) {
//   FrameDialog.hide(ID_DIALOG);
// }