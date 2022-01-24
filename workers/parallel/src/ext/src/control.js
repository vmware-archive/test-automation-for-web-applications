
// Copyright 2022 VMware, Inc.
// SPDX-License-Identifier: Apache License 2.0

// https://stackoverflow.com/questions/105034/create-guid-uuid-in-javascript
function uuidv4() {
  return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c =>
    (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
  )
}

//-----------------------------------------------
// Proxy to access current tab recorder instance
// ----------------------------------------------
function RecorderProxy() {
    this.active = null;
}

RecorderProxy.prototype.start = function(url, server, client, role, testcase, cid) {
	chrome.tabs.getSelected(null, function(tab) {
        chrome.runtime.sendMessage({action: "start", recorded_tab: tab,
                                    start_url: url, client_uuid: client,
                                    server_port: server, client_role: role,
                                    testcase_uuid: testcase, cid: cid});
	});
}

RecorderProxy.prototype.act = function(real_action) {
	chrome.runtime.sendMessage({action: real_action, message: ''});
}

RecorderProxy.prototype.nainput = function(nastring) {
	chrome.runtime.sendMessage({action: 'nainput', 'nastring': nastring});
}

RecorderProxy.prototype.stop = function() {
    chrome.runtime.sendMessage({action: "stop"});
}

RecorderProxy.prototype.pause = function() {
    chrome.runtime.sendMessage({action: "pause"});
}

RecorderProxy.prototype.resume = function() {
    chrome.runtime.sendMessage({action: "resume"});
}

RecorderProxy.prototype.open = function(url, callback) {
    chrome.tabs.getSelected(null, function(tab) {
        chrome.tabs.sendMessage(tab.id, {action: "open", 'url': url}, callback);
    });
}

//-----------------------------------------------
// UI
//----------------------------------------------
function RecorderUI() {
	this.recorder = new RecorderProxy();
	chrome.runtime.sendMessage({action: "get_status"}, function(response) {
        if (!response) {
          ui.set_stopped();
        } else {
            if (!response.active) {
                ui.set_stopped();
            } else {
                ui.set_started();
                if (response.pause) {
                    ui.set_paused();
                }
                document.forms[0].elements["server"].value = response.server;
                document.forms[0].elements["testcase"].value = response.testcase;
                document.forms[0].elements["role"].value = 'leader';
                if (response.role == 'worker') {
                    // worker
                    document.forms[0].elements["role"].value = 'worker';
                    document.forms[0].elements["role"].disabled = true;
                    e = document.getElementById("pause");
                    e.style.display = 'none';
                    e = document.getElementById("resume");
                    e.style.display = 'none';
                    e = document.getElementById("act");
                    e.disabled = true;
                    e = document.getElementById("nainput");
                    e.disabled = true;
                    e = document.getElementById("start");
                    e.disabled = true;
                }
            }
        }
	});
}


RecorderUI.prototype.act = function() {
    var action = document.forms[0].elements["action"].value;
    if (action == "") {
        return false;
    }
    console.log('start action: ', action);
    ui.recorder.act(action);
    return false;
}

RecorderUI.prototype.nainput = function() {
    var sel = document.forms[0].elements["nastrings"];
    var nastring = sel.options[sel.selectedIndex].text;
    if (nastring == "") {
        return false;
    }
    console.log('non-ASCII input: ', nastring);
    ui.recorder.nainput(nastring);
    return false;
}

RecorderUI.prototype.showControlPanel = function() {
    let isShowing = document.forms[0].elements["control-panel"].checked;
    chrome.storage.local.set({showPanel: isShowing});
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        chrome.tabs.sendMessage(tabs[0].id, {action: "show_panel", visible: isShowing});
    });
}

RecorderUI.prototype.start = function() {
    var testcase = document.forms[0].elements["testcase"].value;
    var server = document.forms[0].elements["server"].value;
    var role = document.forms[0].elements["role"].value;

    if ((testcase == "") || (server == "") || (role == "")) {
        return false;
    }

    console.log(testcase, server, role, window.navigator.language);

    client = {
        'uuid': uuidv4(),
        'role': role,
        'testcase': testcase,
        'locale': window.navigator.language,
    }

    // get testcase
    $.ajax({
        url:"http://" + server + "/parallel/connect/",
        dataType: "json",
        type: "POST",
        contentType: "application/json; charset=UTF-8",
        data: JSON.stringify(client)
    }).success(function(data, status, headers, config) {
        console.log("Got testcase successfully.");
        console.log(data.testcase.start_url);

        ui.recorder.start(data.testcase.start_url, server, client.uuid, client.role, testcase, data.client.id);
        ui.set_started()
    }).error(function(data, status, headers, config) {
        console.log("Got testcase failed.")
    });

    return false;
}


RecorderUI.prototype.pause = function() {
    ui.recorder.pause();
    ui.set_paused();
    return false;
}

RecorderUI.prototype.resume = function() {
    ui.recorder.resume();
    ui.set_started();
    return false;
}


RecorderUI.prototype.stop = function() {
    ui.set_stopped();
    // var role = document.forms[0].elements["role"].value;
    // if (role == "leader") {
    //     ui.recorder.stop();
    // }
    ui.recorder.stop();
    return false;
}

RecorderUI.prototype.set_paused = function() {
    var e = document.getElementById("stop");
    e.style.display = '';
    e.onclick = ui.stop;
    e.value = "Stop";
    e = document.getElementById("start");
    e.style.display = 'none';

    // show pause if role = leader
    var role = document.forms[0].elements["role"].value;
    if (role == "leader") {
        e = document.getElementById("pause");
        e.style.display = 'none';
        e = document.getElementById("resume");
        e.style.display = '';
    }
}

RecorderUI.prototype.set_started = function() {
    var e = document.getElementById("stop");
    e.style.display = '';
    e.onclick = ui.stop;
    e.value = "Stop";
    e = document.getElementById("start");
    e.style.display = 'none';

    // show pause if role = leader
    var role = document.forms[0].elements["role"].value;
    if (role == "leader") {
        e = document.getElementById("pause");
        e.style.display = '';
        e = document.getElementById("resume");
        e.style.display = 'none';
        e = document.getElementById("act");
        e.disabled = false;
        e = document.getElementById("nainput");
        e.disabled = false;
    }
}

RecorderUI.prototype.set_stopped = function() {
    chrome.runtime.getPackageDirectoryEntry(function(root) {
        root.getFile("config/default.json", {}, function(fileEntry) {
            fileEntry.file(function(file) {
                var reader = new FileReader();
                reader.onloadend = function(e) {
                    var myFile = JSON.parse(this.result);
                    console.log('config/default.json', myFile);
                    document.forms[0].elements["server"].value = myFile.server;
                    document.forms[0].elements["testcase"].value = myFile.testcase;
                    document.forms[0].elements["role"].value = myFile.role;
                };
                reader.readAsText(file);
            });
        });
    });

    var role = document.forms[0].elements["role"].value;
    if (role == 'leader') {
        var e = document.getElementById("stop");
        e.style.display = 'none';
        e = document.getElementById("start");
        e.style.display = '';
        e = document.getElementById("pause");
        e.style.display = 'none';
        e = document.getElementById("resume");
        e.style.display = 'none';
        e = document.getElementById("act");
        e.disabled = true;
        e = document.getElementById("nainput");
        e.disabled = true;
    }
}


var ui;
// bind events to ui elements
window.onload = function(){
    document.querySelector('button#act').onclick=function() {ui.act(); return false;};
    document.querySelector('button#nainput').onclick=function() {ui.nainput(); return false;};
    document.querySelector('input#control-panel').onclick=function() {ui.showControlPanel();};
    document.querySelector('input#start').onclick=function() {ui.start(); return false;};
    document.querySelector('input#stop').onclick=function() {ui.stop(); return false;};
    document.querySelector('input#pause').onclick=function() {ui.pause(); return false;};
    document.querySelector('input#resume').onclick=function() {ui.resume(); return false;};
    ui = new RecorderUI();
    initControlPanel();
}

function initControlPanel() {
    chrome.storage.local.get({showPanel: false}, function(result) {
        document.querySelector('input#control-panel').checked = result.showPanel;
    });
}