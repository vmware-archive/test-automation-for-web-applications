if (vtaas.utils.isWorker()) {
    document.addEventListener("contextmenu", function(event) {
        event.preventDefault();
    }, true);
}

export function sendReplayFinishedMessage(id, sn, result='success', errorMessage='') {
    let msg = {
        action: "replay-step-finished",
        data: {
            id: id,
            sn: sn,
            result: result,
            errorMessage: errorMessage
        }
    }
    chrome.runtime.sendMessage(msg);
}