const DIALOG_ID = 'vtaas-dialog-replay-progress';

let clients = new Map();

function makeSelector(index) {
    return `#progressTable tbody tr:nth-child(${index})`;
}

function getSnCellElement(index) {
    return $(`#progressTable tr:nth-child(${index}) td.sn-column`);
}

function updateSnCell(index, sn) {
    getSnCellElement(index).text(sn.toString(10));
}

function addTableRow(clientId) {
    let title;
    if (clientId === 'leader') {
        title = 'Leader';
    } else {
        title = `Worker ${clients.size}`;
    }
    clients.set(clientId, {
        title: title,
        sn: 0,
        index: clients.size + 1
    });

    const rowHtml = `
        <tr>
            <th scope="row">${title}:</th>
            <td class="sn-column">0</td>
        </tr>`;
    $('#progressTable tbody').append(rowHtml);
    increaseDialog(0, 25);
}

function increaseDialog(distanceX, distanceY) {
    let width = $('.progress-container').outerWidth(true) + distanceX;
    let height = $('.progress-container').outerHeight(true) + 4 + distanceY;

    $('.progress-container').height($('.progress-container').height() + distanceY);

    let msgData = {
        type: 'DIALOG_RESIZE',
        dialogId: DIALOG_ID,
        height: height + 'px',
        width: width + 'px'
    };
    window.top.postMessage(msgData, '*');
}

addTableRow('leader');

// port connection
let progressPort = chrome.runtime.connect({name: 'replay-progress'});
progressPort.onMessage.addListener(msg => {
    // console.log('Progress dialog: Received progress message.', msg);
    if (!clients.has(msg.clientUuid)) {
        addTableRow(msg.clientUuid);
    }

    let clientIndex = clients.get(msg.clientUuid).index;
    updateSnCell(clientIndex, msg.sn);
});