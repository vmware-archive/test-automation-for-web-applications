// Copyright 2022 VMware, Inc.
// SPDX-License-Identifier: Apache License 2.0

Object.assign(vtaas.state, {
    // backgroud script specific state
    textResources: null,
    locale: null,
    workersNumber: 0,
    mouseOverWaitTime: 4,
    captureScript: null,
    waveTaskId: null,
    otherServers: {
        accessibility: null,
        websocket: null,
        webPageCacheServer: null
    }
});

var testcase_items = new Array();
var empty = true;
var tab_id = null;
var current_tab = null;
var client_uuid = null;
var cid = null;
var replay = "false";
var sendverify = "false";
var consoleid = '';
var replay_items = new Array();
var current_replay_event = null;
var last_replay_eventid = 0;

var parallel_items = new Array();
var current_parallel_event = null;
var last_parallel_eventid = 0;
var max_parallel_event_retry = 6; // retry 6 times by default
var parallel_retry_id = 0;

var temp_local_value = null;
//var contentscript_loadtime = null;
//var windowsload_time = null;
// var recent_mouseover_uievent = {};
// var recent_mouseover_times = {};
var screenshot_messageid = 0;
var locale_values = null;
var real_frames = new Array();

var product_name=null;
fetch(configurl=chrome.runtime.getURL('config/default.json'))
	.then((response)=>response.json())
	.then((json)=>{
		console.log(json);
		product_name=json.prodjs.replace(/\.js/g,'');
		console.log('product_name:',product_name);
});

console.log('init');
chrome.privacy.services.passwordSavingEnabled.set({ value: false });
chrome.privacy.services.translationServiceEnabled.set({ value: false });
// chrome.privacy.services.passwordSavingEnabled.get({}, details => console.log(details.value));

function sleep(miliseconds) {
    var currentTime = new Date().getTime();
    while (currentTime + miliseconds >= new Date().getTime()) {
    }
 }

function uuidv4() {
  return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c =>
    (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
  )
}

function onAttach(tabId) {
    if (chrome.runtime.lastError) {
        alert('Error: ' + chrome.runtime.lastError.message);
        return;
    }
}


function handleFrameTree(frameTree) {
    if (frameTree.frame) {
        console.log("++Frame++", frameTree.frame.id, frameTree.frame.parentId, frameTree.frame.url);
    }
    if (frameTree.childFrames) {
        for (var c = 0; c < frameTree.childFrames.length; c++) {
            handleFrameTree(frameTree.childFrames[c]);
        }
    }
}

function getBodyDOM(responsedDOM) {
    if (responsedDOM.documentURL) {
        console.log("responsedDOM.documentURL: ", responsedDOM.documentURL);
    }
    for(var i = 0 ; i < responsedDOM.root.childNodeCount; i ++ ){
        var firstRootChildren = responsedDOM.root.children[i];
        if (firstRootChildren.frameId) {
            console.log("firstRootChildren.frameId: ", firstRootChildren.frameId);
        }
        for(var j = 0 ; j < firstRootChildren.childNodeCount; j ++){
            var secondChildren = firstRootChildren.children[j];
            if(secondChildren.localName == "body"){
                return secondChildren;
            }
        }
    }
    return "";
}

function search_real_frames(w) {
    if (w.frameId) {
        // console.log("w.frameId: ", w.frameId, w);
        for(var j = 0 ; j < w.childNodeCount; j ++){
            if(w.children[j].localName == "body"){
                // found body, add to real_frames
                real_frames[real_frames.length] = w.children[j];
                // console.log("w.added: ", w);
            }
        }
    }
    if (w.contentDocument) {
        search_real_frames(w.contentDocument);
    }
    for(var i = 0 ; i < w.childNodeCount; i++ ){
        search_real_frames(w.children[i]);
    }
}

function get_modifiers(alt, ctrl, meta, shift) {
    var modifiers = 0;
    if (alt === '1')
        modifiers = modifiers & 1;
    if (ctrl === '1')
        modifiers = modifiers & 2;
    if (meta === '1')
        modifiers = modifiers & 4;
    if (shift === '1')
        modifiers = modifiers & 8;
    return modifiers
  }

function jQueryPostJsonData(url, data, successCallback, failCallback) {
    ajaxResult = $.ajax({
        url: url,
        dataType: "json",
        method: "POST",
        contentType: "application/json; charset=UTF-8",
        data: JSON.stringify(data)
    }).done(function(data, textStatus, jqXHR) {
        if (successCallback) {
            successCallback(data, textStatus, jqXHR);
        }
    }).fail(function(jqXHR, textStatus, errorThrown) {
        if (failCallback) {
            failCallback(jqXHR, textStatus, errorThrown);
        }
    });
    return ajaxResult;
}

function post_worker_status(event_id, event_status, event_message, event_action='') {
    // if (event_id !== 0) {
    //     // disable message specific status, support locale status(event_id=0) firstly
    //     return;
    // }
    if ((event_status != 'page-load') && (event_status != 'screenshot') && (event_status != 'sendverify')) {
        // Only page-load/screenshot is tracked
        return;
    }
    data = {
        'client': client_uuid,
        'eventid': event_id.toString(),
        'status': event_status,
        'message': event_message,
        'event_action': event_action
    };
    jQueryPostJsonData(
        vtaas.utils.getUrlStatus(),
        data
    ).done(function(data, textStatus, jqXHR) {
        console.log("Post status successfully.");
    }).fail(function(jqXHR, textStatus, errorThrown) {
        console.log("Post status failed.")
    });
}

function postReplayedEvent(sn) {
    vtaas.websocket.status.sendWorkerReplayedEvent(
        {
            clientUuid: client_uuid,
            sn: sn
        }
    )
}

function cropImage(imageDataUrl, rect) {
    let canvas = document.createElement("canvas");
    canvas.width = rect.width;
    canvas.height = rect.height;

    let image = new Image();
    function getOnloadHandler(resolve, reject) {
        return function() {
            let context = canvas.getContext("2d");
            context.drawImage(image,
                rect.left, rect.top,
                rect.width, rect.height,
                0, 0,
                rect.width, rect.height
            );
            let croppedImage = canvas.toDataURL("image/png");
            // chrome.tabs.create({
            //     url: croppedImage,
            //     windowId: current_tab.windowId
            // });
            resolve(croppedImage);
        }
    }

    let promise = new Promise((resolve, reject) => {
        image.onload = getOnloadHandler(resolve, reject);
        image.src = imageDataUrl;
    });
    return promise;
}

function retrieveTextResources(product, locales) {
    let sendData = {
        product: product,
        locale: locales,
        resultStyle: "locale-row"
    }
    jQueryPostJsonData(
        vtaas.utils.getUrlTextResources(),
        sendData
    ).done(function(data, textStatus, jqXHR) {
        if (data.message !== 'success') {
            console.log("Getting text resources failed: " + data.message);
            return;
        }
        vtaas.state.textResources = data.textResources;
    }).fail(function(jqXHR, textStatus, errorThrown) {
        console.log("Getting text resources failed.")
    });
}

var funcToInject = function () {
    var n
        , text1 = ''
        , text2 = ''
        , walk = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null, false);
    while (n = walk.nextNode()) {
        var ignore = { "STYLE": 0, "CODE": 0, "SCRIPT": 0, "NOSCRIPT": 0, "IFRAME": 0, "OBJECT": 0 }
        if (n.parentNode.tagName in ignore || n.parentNode instanceof HTMLUnknownElement) {
            continue;
        }
        node_text1 = n.textContent.trim()
        if (node_text1.length > 0){
            text1 += node_text1 + "=+=";
        }

        // node_text2 = n.nodeValue.trim()
        // if (node_text2.length > 0){
        //     text2 += node_text2 + "=+=";
        // }
    }
    return text1;
};
/* This line converts the above function to string
* (and makes sure it will be called instantly) */
var jsCodeStr = ';(' + funcToInject + ')();';


var funcToExtractDom = function (){

	function getAbsoluteLeft(iframe_left,node){
		var offsetLeft=0;
		if (iframe_left>0){
			offsetLeft=iframe_left;
		}
		offsetLeft=(offsetLeft+node.offsetLeft);
		if(node.offsetParent!=null){
			offsetLeft=(offsetLeft+getAbsoluteLeft(0,node.offsetParent));
		}
		return offsetLeft;
		}

	function getAbsoluteTop(iframe_top,node){
		var offsetTop=0;
		if (iframe_top>0){
			offsetTop=iframe_top;
		}
		offsetTop=(offsetTop+node.offsetTop);
		if(node.offsetParent!=null){
			offsetTop=(offsetTop+getAbsoluteTop(0,node.offsetParent));
		}
		return offsetTop;
	}

	function getLocaltion(iframe_left,iframe_top,node){
		var absolute_left=getAbsoluteLeft(iframe_left,node);
		var absolute_top=getAbsoluteTop(iframe_top,node);
		return '\''+absolute_left+'\',\''+absolute_top+'\',\''+(absolute_left+node.offsetWidth)+'\',\''+(absolute_top+node.offsetHeight)+'\'';
	}

	function getElementPosition(s_location,direction){
		var position=0;
		var positions=s_location.replace(/\'/g,'').split(',');
		if (positions.length==4){
			if ((direction=='left') && (parseInt(positions[0])>0)){
				position=positions[0];
			}
			else if ((direction=='top') && (parseInt(positions[1])>0)){
				position=positions[1];
			}
		}
		return parseInt(position);
	}

	function extractString(str){
		str=convertType(str);
		str=str.replace(/<[\s\S]*?>/g,'^');
		if (product_name=='airwatchconsole'){
			str=str.replace(/{[\s\S]*?}/g,'^');
			str=str.replace(/\$\(function[\s\S]*\);/g,'^');
			str=str.replace(/if \([\s\S]*\)/g,'^');
			str=str.replace(/jQuery\([\s\S]*\);/g,'^');
			str=str.replace(/\" data-fave-id=\"\">/g,'^');
		}
		str=str.replace(/&nbsp;|&amp;|[\r\n]/g,'');
		str=str.replace(/\\/g,'\\\\')
		str=str.replace(/'/g,'\\\'');
		str=removeWhitespaces(str);
		str=removeSeperator(str);
		return str;
	}

	function convertType(str)
	{
		if ((typeof str)=='number')
		{
			str=str.toString();
		}else if ((typeof str)!='string')
		{
			console.log(typeof str);
		}
		return str;
	}

	function removeWhitespaces(str){
		while (str.indexOf('  ')>=0){
			str=str.replace('  ',' ');
		}
		return str;
	}

	function removeSeperator(str){
		var seperator_reg=/\s*\^\s*\^\s*/;
		while (str.match(seperator_reg)!=null){
			str=str.replace(seperator_reg,'^');
		}
		return str;
	}

	function removedGarbageChars(str){
		while (str.indexOf(')})}')>=0){
			str=str.replace(')})}',')}').replace('{({(','{(');
		}
		while (str.indexOf(')(')>=0){
			str=str.replace(')(','),');
		}
		while (str.indexOf('),{')>=0){
			str=str.replace('),{',')},{');
		}
		return str;
	}

	function validateElementVisiblity(display){
		var matched=display.match(/none/g);
		return (matched!=null);
	}

	function setSleep(Millis){
		var now=new Date();
		var exitTime=now.getTime()+Millis;
		while (true)
		{
			now=new Date();
			if (now.getTime()>exitTime){
				return;
			}
		}
	}

	function getXPath(element){
		if (element.tagName=='HTML'){
			return '/HTML[1]';
		}
		if (element===document.body){
			return '/HTML[1]/BODY[1]';
		}
		var ix=0;
		var siblings=element.parentNode.childNodes;
		for (var i=0;i<siblings.length;i++){
			var sibling=siblings[i];
			if (sibling===element)
				return getXPath(element.parentNode)+'/'+element.tagName+'['+(ix+1)+']';
			if (sibling.nodeType===1 && sibling.tagName===element.tagName)
				ix++;
		}
	}

	function traversalAPI(parent_left,parent_top,node,parentIndex)
	{
		var ignore={"STYLE":0,"CODE":0,"SCRIPT":0,"NOSCRIPT":0,"OBJECT":0,"undefined":0}
		if (node==null || node instanceof HTMLUnknownElement || node.tagName in ignore){
			return parentIndex;
		}
		var valideNodeList={
								"LABEL":0,"INPUT":0,"BUTTON":0,"DIV":0,"SPAN":0,
								"IFRAME":0,"UL":0,"LI":0,"A":0,
								"H1":0,"H2":0,"H3":0,"H4":0,"H5":0,"H6":0,"HGROUP":0,
								"HEADER":0,"SMALL":0,"SECTION":0,"NAVIGATION":0,"NAV":0
							}
		var node_text1='';
		if (node.tagName in valideNodeList)
		{
			var none='none';
			var style=window.getComputedStyle(node,null);
			if ((style.display !=null) && (style.display==none)){
				var element_display=style.display;
				if (validateElementVisiblity(element_display)){
					return parentIndex;
				}
			}
			index+=1;
			node_text1='\'index\''+':\''+index.toString()+'\',';
			node_text1+='\'parentIndex\''+':\''+parentIndex.toString()+'\',';
			node_text1+='\'tagName\''+':\''+node.tagName+'\',';
			if (node.id!=null){
				var element_id=extractString(node.id);
				if (element_id=='')
					element_id=none;
				node_text1+='\'id\''+':\''+element_id+'\',';
			}
			if (node.name!=null){
				var element_name=extractString(node.name);
				if (element_name=='')
					element_name=none;
				node_text1+='\'name\''+':\''+element_name+'\',';
			}
			if (node.className!=null){
				var element_className=extractString(node.className);
				if (element_className=='')
					element_className=none;
				node_text1+='\'className\''+':\''+element_className+'\',';
			}
			if (node.value!=null){
				var element_value=extractString(node.value);
				if (element_value=='')
					element_value=none;
				node_text1+='\'value\''+':\''+element_value+'\',';
			}
			if (node.text!=null){
				var element_text=extractString(node.text);
				if (element_text=='')
					element_text=none;
				node_text1+='\'text\''+':\''+element_text+'\',';
			}
			if (node.innerHTML!=null){
				var element_innerHTML=extractString(node.innerHTML);
				if (element_innerHTML==null || element_innerHTML=='')
					element_innerHTML=none;
				node_text1+='\'innerHTML\''+':\''+element_innerHTML+'\',';
			}
			var element_xpath=getXPath(node);
			if (element_xpath!= null){
				element_xpath=extractString(element_xpath);
				if (element_xpath==null || element_xpath=='')
					element_xpath=none;
				node_text1+='\'xpath\''+':\''+element_xpath+'\',';
			}
			var s_location=getLocaltion(parent_left,parent_top,node);
			node_text1+='\'location\''+':'+'('+s_location+')';
			if (node_text1.length>0){
				if (full_text==''){
					full_text+='{'+node_text1+'}';
				}
				else{
					full_text+=',{'+node_text1+'}';
				}
			}
			if (node.tagName=="IFRAME"){
				var iframe_left=getElementPosition(s_location,'left');
				var iframe_top=getElementPosition(s_location,'top');
				//console.log(s_location);
				//console.log('left='+iframe_left+',top='+iframe_top);
				setDOMByDocument(iframe_left,iframe_top,node.contentDocument,parentIndex);
			}
		}
		else{
				//console.log(node.tagName);
		}
		for (var i=0;i<node.children.length;i++){
			if (i==0)
			{
				parentIndex=index;
			}
			child=node.children[i];
			traversalAPI(parent_left,parent_top,child,parentIndex);
		}
		return parentIndex;
	}

	function setDOMByDocument(parent_left,parent_top,doc,parentIndex){
		root_node=doc.body;
		traversalAPI(parent_left,parent_top,root_node,parentIndex);
		return;
	}

	var index=0;
	var full_text='';
	var counter=0;
	while (counter<3){
		setDOMByDocument(0,0,document,0);
		if (full_text!=''){
			full_text='('+full_text+')';
			break;
		}
		else{
			setSleep(1000);
			counter+=1;
		}
	}
	full_text=removedGarbageChars(full_text);
	return full_text;
};

vtaas.websocket = {
    status: {
        wsb: null,

        connect: function() {
            if (vtaas.utils.isWorker()) {
                let wsPath = vtaas.utils.getWsUrl(`/status/${vtaas.state.testcaseUuid}/?role=worker`);
                console.log(wsPath);
                this.wsb = new ReconnectingWebSocket(wsPath);
                this.wsb.onmessage = function(data) {
                    // Currently it has no data to receive, it may be used later.
                    console.log("Worker: got status websocket message", data);
                };
            } else {
                let wsPath = vtaas.utils.getWsUrl(`/status/${vtaas.state.testcaseUuid}/?role=leader`);
                console.log(wsPath);
                this.wsb = new ReconnectingWebSocket(wsPath);
                this.wsb.onmessage = function(data) {
                    console.log("Leader: got status websocket message", msg);
                    if (msg.type === 'replay') {
                        vtaas.progressPort.postMessage(msg.data);
                    }
                };
            }
        },

        disconnect: function() {
            if (this.wsb) {
                this.wsb.socket.close(1000, '', {keepClosed: true});
            }
        },

        sendWorkerReplayedEvent: function(event) {
            if (this.wsb) {
                this.wsb.send(JSON.stringify({type: 'replay', data: event}));
            }
        }
    }
}

function replay_one_message(message) {
    if ((message.event == "19") || (message.event == "20") || (message.event == "24")) {
        data = {
            id: message.id,
            sn: message.sn,
            product: message.product,
            action: message.event,
            button: message.button,
            text: message.obj_text,
            class: message.obj_class,
            value: message.obj_value,
            vuid: message.obj_vuid,
            x: message.obj_x,
            y: message.obj_y,
            top: message.obj_top,
            left: message.obj_left,
            right: message.obj_right,
            bottom: message.obj_bottom,
            scrolltop: message.obj_scrolltop,
            scrollleft: message.obj_scrollleft,
            obj_id: message.obj_id,
            xpath: message.obj_xpath,
            xpath2: message.obj_xpath2,
            xpath3: message.obj_xpath3,
            selector: message.obj_selector,
            sendverify: sendverify,
            parent: message.obj_parent,
            brother: message.obj_brother,
            child: message.obj_child
        };

        console.log("send mouse request: ", data, tab_id);
        chrome.tabs.sendMessage(tab_id, data);
    } else if ((message.event == "9") || (message.event == "10")) {
        // keydown, keyup
        var keyevent_type = "keyDown";
        if (message.event != "9") {
            keyevent_type = "keyUp";
        }

        var keyevent_modifiers = get_modifiers(message.obj_right,   //alt
                                               message.obj_left,    //ctrl
                                               message.obj_bottom,  //meta
                                               message.obj_top);    //shift

        var options = {type: keyevent_type,
                       modifiers: keyevent_modifiers,
                       key: message.obj_x,
                       code: message.obj_y,
                       unmodifiedText: "",
                       text: "",
                       windowsVirtualKeyCode: parseInt(message.obj_value),
                       nativeVirtualKeyCode: parseInt(message.obj_value),
                       location: parseInt(message.obj_text)};

        // https://stackoverflow.com/questions/21965656/using-chrome-remote-debugging-for-sending-enter-key
        if (parseInt(message.obj_value) == 13) {
            if (keyevent_type == "keyDown") {
                options.type = "rawKeyDown";
                console.log('dispatchKeyEvent: ', options.type, options);
                chrome.debugger.sendCommand({tabId: tab_id}, 'Input.dispatchKeyEvent', options);

                sleep(100);
                options.type = "char";
                options.text = String.fromCharCode(13);
                options.unmodifiedText = String.fromCharCode(13);
                console.log('dispatchKeyEvent: ', options.type, options);
                chrome.debugger.sendCommand({tabId: tab_id}, 'Input.dispatchKeyEvent', options);

                sleep(100);
                options.type = "keyUp";
                console.log('dispatchKeyEvent: ', options.type, options);
                chrome.debugger.sendCommand({tabId: tab_id}, 'Input.dispatchKeyEvent', options);
            }
        } else {
            console.log('dispatchKeyEvent: ', options.type, options);
            chrome.debugger.sendCommand({tabId: tab_id}, 'Input.dispatchKeyEvent', options);
        }
        post_worker_status(message.id, 'success', '');
        finishStepReplay(message.id, message.sn);
    } else if (message.event == "11") {
        // char
        if (message.obj_text == 'insertText') {
            var options = {type: "char",
                           key: message.obj_value,
                           text: message.obj_value};
            console.log('dispatchKeyEvent: char', options);
            chrome.debugger.sendCommand({tabId: tab_id}, 'Input.dispatchKeyEvent', options);
            post_worker_status(message.id, 'success', '');
            finishStepReplay(message.id, message.sn);
        }
    } else if (message.event == "2") {
        // input
        orig_value = message.obj_value;

        let orig_str = '';
        let input_arr = orig_value.split('%%');
        if (input_arr.length == 3) {
            // decrypt
            let orig_length = input_arr[0];
            let curr_length = input_arr[2];
            let str = unescape(input_arr[1]);
            let arr = str.split(',');
            let number = arr.pop();
            let newarr = [];
            arr.forEach(function (item) {
                let temp = String.fromCharCode(item - number);
                newarr.push(temp);
            });
            orig_str = newarr.join('');
            if ((String(orig_str.length) == orig_length) && (String(input_arr[1].length) == curr_length)) {
                orig_value = orig_str;
            }
        }

        local_value = orig_value.replace('$cid', cid);
        for (var key in locale_values) {
            local_value = local_value.replace(key, locale_values[key]);
            console.log(key, 'replaced by', locale_values[key]);
        }
        chrome.tabs.sendMessage(tab_id, {id: message.id,
                                        sn: message.sn,
                                        product: message.product,
                                        action: message.event,
                                        value: local_value,
                                        vuid: message.obj_vuid,
                                        obj_id: message.obj_id,
                                        xpath: message.obj_xpath,
                                        xpath2: message.obj_xpath2,
                                        xpath3: message.obj_xpath3,
                                        selector: message.obj_selector,
                                        sendverify: sendverify});
    } else if (message.event == "16") {
        // unlocal_check
        chrome.tabs.sendMessage(tab_id, {id: message.id,
                                        sn: message.sn,
                                        action: "unlocal_check",
                                        verify_value: message.verify_value,
                                        glossary: data.glossary});
    } else if (message.event == "17") {
        // clear all events
        parallel_items = new Array();
        current_parallel_event = null;
        last_parallel_eventid = 0;
        parallel_retry_id = 0;
        // refresh
        chrome.tabs.sendMessage(tab_id, {id: message.id,
                                        sn: message.sn,
                                        action: "worker_refresh"});
    }else if(message.event=="18"){
        //screenshot
        console.log("18-start: ",message);
        post_worker_status(message.id,'info','worker recieved screenshot message');
        let screenshot_messageid=message.id;

        function extractDomAndPost(img) {
            chrome.tabs.executeScript({code: ';product_name="'+product_name+'";('+funcToExtractDom+')();',allFrames:true},function(allText){
                if(chrome.runtime.lastError){
                    alert('ERROR:\n'+chrome.runtime.lastError.message);
                    post_worker_status(message.id,'error', 'failed to get DOM');
                }else if(allText[0].length>0){
                    let content=allText[0];
                    let xhr=new XMLHttpRequest();
                    let screenshotData = {
                        'test_id': message.testcase,
                        'run_id': message.run_id,
                        'event_id': message.id,
                        'locale': vtaas.state.locale,
                        'name': message.obj_text,
                        'img':img,
                        'client':client_uuid,
                        'event':screenshot_messageid,
                        'content':content
                    };
                    jQueryPostJsonData(
                        message.platform + "/screenshot/take_screenshot/",
                        screenshotData
                    ).done(function(data, textStatus, jqXHR) {
                        console.log("Record screenshot successfully.");
                        let curr_time = (new Date()).toISOString().slice(0, 19);
                        post_worker_status('18','screenshot',curr_time);
                        finishStepReplay(message.id, message.sn);
                    }).fail(function(jqXHR, textStatus, errorThrown) {
                        console.log("Record screenshot failed.");
                    });
                    chrome.tabs.sendMessage(tab_id,{action:"worker_message", 'message':'Screenshot Done!'});
                }else{
                    post_worker_status(screenshot_messageid,'error','DOM is null');
                }
            });
        }

        function doCapture(isElement, rect) {
            chrome.tabs.captureVisibleTab(null,{format:'png'},function(img){
                if(chrome.runtime.lastError){
                    alert('ERROR:\n'+chrome.runtime.lastError.message);
                    post_worker_status(message.id,'error','failed to take screenshot');
                } else {
                    if (isElement) {
                        cropImage(img, rect).then(function(croppedImage) {
                            extractDomAndPost(croppedImage);
                        });
                    } else {
                        extractDomAndPost(img);
                    }
                }
            });
        }

        let extraData = JSON.parse(message.obj_assert);
        if (extraData.areaType === 'element') {
            let messageData = {
                action: "screenshot_element_rect",
                id: message.id,
                product: message.product,
                obj_id: message.obj_id,
                xpath: message.obj_xpath,
                xpath2: message.obj_xpath2,
                xpath3: message.obj_xpath3,
                selector: message.obj_selector,
            };
            chrome.tabs.sendMessage(tab_id, messageData, function(response) {
                doCapture(true, response);
            });
        } else {
            doCapture(false, null);
        }
    }else if(message.event=="25"){
        // Report issue
        console.log("25-start: ",message);
        post_worker_status(message.id,'info','worker recieved report issue message');
        screenshot_messageid=message.id;
        chrome.tabs.captureVisibleTab(null,{format:'png'},function(img){
            if(chrome.runtime.lastError){
                alert('ERROR:\n'+chrome.runtime.lastError.message);
                post_worker_status(message.id,'error','failed to take screenshot');
            }else{
                chrome.tabs.executeScript({code: ';product_name="'+product_name+'";('+funcToExtractDom+')();',allFrames:true},function(allText){
                    if(chrome.runtime.lastError){
                        alert('ERROR:\n'+chrome.runtime.lastError.message);
                        post_worker_status(message.id,'error', 'failed to get DOM');
                    }else if(allText[0].length>0){
                        var content=allText[0];
                        var xhr=new XMLHttpRequest();
                        reportIssueData={
                            'test_id': message.testcase,
                            'run_id': message.run_id,
                            'event_id': message.id,
                            'locale': vtaas.state.locale,
                            'name': message.obj_text,
                            'img': img,
                            'client': client_uuid,
                            'event': screenshot_messageid,
                            'content': content
                        }
                        jQueryPostJsonData(
                            message.platform + "/reportedissue/report_issue/",
                            reportIssueData
                        ).done(function(data, textStatus, jqXHR) {
                            console.log("Report issue successfully.");
                            var curr_time=new Date().toISOString().slice(0,19);
                            post_worker_status('25','report_issue',curr_time);
                            finishStepReplay(message.id, message.sn);
                        }).fail(function(jqXHR, textStatus, errorThrown) {
                            console.log("Report issue failed.");
                        });
                        chrome.tabs.sendMessage(tab_id,{action:"worker_message", 'message':'Report issue is Done!'});
                    }else{
                        post_worker_status(screenshot_messageid,'error','DOM is null');
                    }
                });
            }
        });
    } else if (message.event == "26") {
        // assert
        data = {
            id: message.id,
            sn: message.sn,
            product: message.product,
            action: message.action,
            button: message.button,
            text: message.obj_text,
            class: message.obj_class,
            value: message.obj_value,
            vuid: message.obj_vuid,
            x: message.obj_x,
            y: message.obj_y,
            top: message.obj_top,
            left: message.obj_left,
            right: message.obj_right,
            bottom: message.obj_bottom,
            scrolltop: message.obj_scrolltop,
            scrollleft: message.obj_scrollleft,
            obj_id: message.obj_id,
            xpath: message.obj_xpath,
            xpath2: message.obj_xpath2,
            xpath3: message.obj_xpath3,
            selector: message.obj_selector,
            assert: message.obj_assert,
            sendverify: sendverify
        };
        chrome.tabs.sendMessage(tab_id, data);
    }
}


function RunParallelEvents() {
    if (current_parallel_event) {
        // check if last event is done
        if ( (current_parallel_event.id == last_parallel_eventid) || (parallel_retry_id >= max_parallel_event_retry) ){
            current_parallel_event = null;
            last_parallel_eventid = 0;
            parallel_retry_id = 0;
        } else {
            // try again
            parallel_retry_id += 1;
            console.log('parallel again: ', current_parallel_event, parallel_items.length, parallel_retry_id);
            if (current_parallel_event.event == "20") {
                current_parallel_event.event = "19";
                replay_one_message(current_parallel_event);
                sleep(500);
                current_parallel_event.event = "20";
            }
            replay_one_message(current_parallel_event);
            setTimeout("RunParallelEvents()", 1000);
            return;
        }
    }

    // another message
    new_message = parallel_items.shift();
    if (!new_message) {
        // all done, check again after 1s
        setTimeout("RunParallelEvents()", 1000);
        return;
    }
    console.log('parallel new: ', new_message, parallel_items.length);
    if ((new_message.event == "19") || (new_message.action == "open")) {
        setTimeout("RunParallelEvents()", 200);
        return;
    }
    if (new_message.event == "24") {
        // current_parallel_event = new_message;
        replay_one_message(new_message);
        setTimeout("RunParallelEvents()", 200);
    } else if (new_message.event == "20") {
        new_message.event = "19";
        replay_one_message(new_message);
        sleep(500);
        new_message.event = "20";
        current_parallel_event = new_message;
        replay_one_message(new_message);
        setTimeout("RunParallelEvents()", 500);
    } else {
        replay_one_message(new_message);
        setTimeout("RunParallelEvents()", 200);
    }
}

const recordedEvents = {
    MAX_ERTRY: 3,
    EVENT_CACHE_TIME: 500, // The time to cache events and sort them in ms
    retryCount: 0,
    isSending: false,
    inHaltState: false,
    events: new Array(),
    eventMeta: new Map(),
    sn: 0,
    leaderSN: 0,

    getEventKey: function(e) {
        return e.event + e.recordtime;
    },

    append: function(e, successCallback) {
        this.leaderSN++;
        vtaas.progressPort.postMessage({clientUuid: 'leader', sn: this.leaderSN});

        if (successCallback) {
            this.eventMeta.set(this.getEventKey(e), {successCallback});
        }
        this.events.push(e);
        this.events.sort(function(a, b) {
            if (a.recordtime < b.recordtime) {
              return -1;
            }
            if (a.recordtime > b.recordtime) {
              return 1;
            }
            return 0;
          });
        this.runPost();
    },

    collectAvailableEvents: function() {
        const availableEvents = new Array();

        const now = new Date();
        while (this.events.length > 0) {
            e = this.events[0];
            const eventTime = Date.parse(e.recordtime);
            if (now.getTime() - eventTime < this.EVENT_CACHE_TIME) {
                break;
            }
            e.sn = ++this.sn;
            availableEvents.push(e);
            this.events.shift();
        }
        return availableEvents;
    },

    runPost: function() {
        if (this.isSending || this.inHaltState) {
            return;
        }

        const availableEvents = this.collectAvailableEvents();
        if (availableEvents.length === 0) {
            return;
        }

        this.postToServer(availableEvents);
    },

    postToServer: function(events) {
        this.retryCount += 1;
        if (this.retryCount > this.MAX_ERTRY) {
            console.log("Failed to post recorded events to server", event);
            // TODO: show the failed info to front panel, user should stop.
            this.inHaltState = true;
            return;
        }

        this.isSending = true;
        // send to server
        jQueryPostJsonData(
            vtaas.utils.getUrlRecord(),
            events
        ).done((data, textStatus, jqXHR) => {
            console.log("Record successfully.", events);
            for (let e of events) {
                eventKey = this.getEventKey(e);
                if (this.eventMeta.has(eventKey)) {
                    if (this.eventMeta.get(eventKey).successCallback) {
                        this.eventMeta.get(eventKey).successCallback();
                    }
                    this.eventMeta.delete(eventKey);
                }
            }
            this.isSending = false;
            this.retryCount = 0;
            this.runPost();
        }).fail((jqXHR, textStatus, errorThrown) => {
            console.log("Record failed.", events);
            this.isSending = false;
            this.postToServer(events);
        });
    },

    msgAppendHandler: function(request, sender, sendResponse) {
        // testcase_items[testcase_items.length] = request.obj;
        // empty = false;
        if (!(client_uuid && vtaas.state.server)) {
            console.log('Client UUID and server is invalid', request);
            return;
        }
        console.log('The event to record:', request);
        let uievent = null;
        let type = request.obj.type || request.obj.event;
        if (typeof type !== 'number') {
            // console.warn('The event to record with no event type', request, typeof type, type);
            return;
        }
        mouseOverProcessor.clearEvent(type);

        if ((type == 19) || (type == 20) || (type == 24) || (type == 1)){
            let my_obj_value = request.obj.info.value;
            let my_type = request.obj.info.type;
            if (my_type) {
                if (my_type.indexOf('password') >= 0) {
                    let newstr = [];
                    let number = Math.random()*200;
                    number = Math.trunc(number);
                    for (let i = 0; i < my_obj_value.length; i++) {
                        newstr.push(my_obj_value.charCodeAt(i) + number);
                    }
                    newstr.push(number);
                    new_obj_value = escape(newstr.toString());
                    my_obj_value = my_obj_value.length + '%%' + new_obj_value + '%%' + new_obj_value.length;
                }
            }

            uievent = {
                'client': client_uuid,
                'event': type,
                'action': request.obj.info.action, // if default avalue '' then server will handle
                'button': request.obj.button,
                'obj_text': request.obj.info.text,
                'obj_class': request.obj.info.class,
                'obj_value': my_obj_value,
                'obj_vuid': request.obj.vuid,
                'obj_x': request.obj.x.toFixed(2),
                'obj_y': request.obj.y.toFixed(2),
                'obj_left': request.obj.rect.left.toFixed(2),
                'obj_top': request.obj.rect.top.toFixed(2),
                'obj_right': request.obj.rect.right.toFixed(2),
                'obj_bottom': request.obj.rect.bottom.toFixed(2),
                'obj_scrolltop': request.obj.scrolltop.toFixed(2),
                'obj_scrollleft': request.obj.scrollleft.toFixed(2),
                'obj_id': request.obj.info.id,
                'obj_xpath': request.obj.info.xpath,
                'obj_xpath2': request.obj.info.xpath2,
                'obj_xpath3': request.obj.info.xpath3,
                'obj_xpath4': request.obj.xpath4,
                'captureid': request.obj.captureid,
                'verify_type' : request.obj.info.verify_type,
                'verify_value' : request.obj.info.verify_value,
                'obj_selector': request.obj.info.selector,
                'obj_parent': request.obj.info.parent,
                'obj_brother': request.obj.info.brother,
                'obj_child': request.obj.info.child,
                'recordtime': request.obj.recordtime
            };
            if (type == 24) {
                mouseOverProcessor.resetLastEvent(uievent);
                return;
            }
        } else if ((type == 9) || (type == 10)) {
            uievent = {
                'client': client_uuid,
                'event': type,
                'action': '', // let server decide
                'obj_text': request.obj.location,
                'obj_x': request.obj.key,
                'obj_y': request.obj.code,
                'obj_value': request.obj.keycode,
                'obj_left': request.obj.ctrl,
                'obj_top': request.obj.shift,
                'obj_right': request.obj.alt,
                'obj_bottom': request.obj.meta,
                'recordtime': request.obj.recordtime
            };
        } else if (type == 11) {
            uievent = {
                'client': client_uuid,
                'event': type,
                'action': '', // let server decide
                'obj_text': request.obj.inputtype,
                'obj_value': request.obj.data,
                'recordtime': request.obj.recordtime
            };
        } else if (type == 29) {
            uievent = {
                'client': client_uuid,
                'event': type,
                'action': '', // let server decide
                'obj_text': request.obj.ptype,
                'obj_value': request.obj.result,
                'recordtime': request.obj.recordtime
            };
        } else if (type == 2) {
            let my_obj_value = request.obj.info.value;
            let my_type = request.obj.info.type;
            if (my_type) {
                if (my_type.indexOf('password') >= 0) {
                    let newstr = [];
                    let number = Math.random()*200;
                    number = Math.trunc(number);
                    for (let i = 0; i < my_obj_value.length; i++) {
                        newstr.push(my_obj_value.charCodeAt(i) + number);
                    }
                    newstr.push(number);
                    new_obj_value = escape(newstr.toString());
                    my_obj_value = my_obj_value.length + '%%' + new_obj_value + '%%' + new_obj_value.length;
                }
            }

            uievent = {
                'client': client_uuid,
                'event': type,
                'action': request.obj.info.action, // if default avalue '' then server will handle
                'obj_value': my_obj_value,
                'obj_class': request.obj.info.type,
                'obj_vuid': request.obj.vuid,
                'obj_id': request.obj.info.id,
                'obj_xpath': request.obj.info.xpath,
                'obj_xpath2': request.obj.info.xpath2,
                'obj_xpath3': request.obj.info.xpath3,
                'verify_type' : request.obj.info.verify_type,
                'verify_value' : request.obj.info.sendkey_ok?request.obj.info.verify_value:'', // sendkey_ok not for radio / checkbox
                'obj_selector': request.obj.info.selector,
                'recordtime': request.obj.recordtime
            };

            // change to local_value
            if (vtaas.utils.isLeader()) {
                orig_value = request.obj.info.value;
                local_value = orig_value.replace('$cid', cid);
                if (local_value != orig_value) {
                    // modify local value when user input $cid
                    console.log(orig_value, local_value);
                    temp_local_value = local_value;
                    chrome.tabs.sendMessage(tab_id, {action: "2",
                                                    'value': local_value,
                                                    'selector': request.obj.info.selector,
                                                    'xpath': request.obj.info.xpath,
                                                    'xpath2': request.obj.info.xpath2});
                }
            }
            if (request.obj.info.value == temp_local_value) {
                // auto generated 'change' event, ignore it
                temp_local_value = null;
                return;
            }
        } else {
            uievent = request.obj;
            uievent.client = client_uuid;
        }

        console.log("original", request, client_uuid, vtaas.state);

        function isManualEvent(uievent) {
            return (uievent.event === 18) || (uievent.event === 26) || (uievent.event === 27);
        }
        if ((vtaas.utils.isLeader()) && (vtaas.utils.isRunning() || isManualEvent(uievent))) {
            this.append(uievent);
            console.log("appended:", uievent);
        }
    }
}
setInterval(recordedEvents.runPost.bind(recordedEvents), 1000);

function attachDebugger() {
    let retryCount = 0;
    function attach(tabId) {
        chrome.debugger.attach({tabId: tabId}, "1.3", function() {
            if (chrome.runtime.lastError) {
                retryCount++;
                if (retryCount > 15) {
                    alert('Error: ' + chrome.runtime.lastError.message);
                    return;
                } else {
                    console.error('Error: ' + chrome.runtime.lastError.message)
                    setTimeout(attach, 1000, tabId);
                }
            } else {
                chrome.debugger.sendCommand({tabId: tabId}, 'DOM.enable');
                // wait 1 seconds to run parallel event
                setTimeout("RunParallelEvents()", 1000);
            }
        });
    }
    attach(tab_id);
}

function start_all(start_url) {
    // let extension_url = 'chrome://extensions/?id=' + vtaas.state.extensionid;
    // const createData = {url: extension_url, incognito: false};
    // chrome.windows.create(createData);

    // Cannot do the configuration automatically
    // https://stackoverflow.com/questions/24600495/chrome-tabs-executescript-cannot-access-a-chrome-url
    //
    // chrome.tabs.query({"active": true}, function(tabs) {
    //     current_tab = tabs[0];
    //     console.log("current_tab: ", tabs, current_tab.id, current_tab.index, current_tab.url);
    //     tab_id = current_tab.id;
    //     if (current_tab.url.indexOf("chrome://extensions/?id=") >= 0) {
    //         let clickScript = 'document.querySelector("body > extensions-manager").shadowRoot.querySelector("#viewManager > extensions-detail-view").shadowRoot.querySelector("#allow-incognito").shadowRoot.querySelector("#crToggle").click();';
    //         chrome.tabs.executeScript({
    //             code: clickScript,
    //             allFrames: true
    //         }, function() {
    //             if (chrome.runtime.lastError) {
    //                 /* Report any error */
    //                 console.log('Extension not enabled: ' + chrome.runtime.lastError.message);
    //             } else {
    //                 console.log("Extension enabled for incognito mode.");
    //             }
    //         });
    //     }
    //     chrome.tabs.remove(tab_id);
    // });
    sleep(2000);
    chrome.tabs.query({"active": true}, function(tabs) {
        current_tab = tabs[0];
        console.log("current_tab: ", tabs, current_tab.id, current_tab.index, current_tab.url);
        tab_id = current_tab.id;

        chrome.tabs.update(tab_id, {url: start_url, highlighted: true, active: true}, function(tab) {
            // current_tab = tab;
            // tab_id = current_tab.id;
            // record open event
            console.log("client_uuid: " + client_uuid);
            uievent = {
                'client': client_uuid,
                'action': 'open',
                'obj_xpath': start_url,
                'obj_text': vtaas.state.role,
                'recordtime': new Date().toISOString()
            };
            recordedEvents.append(uievent);
            chrome.tabs.sendMessage(tab_id, {action: "open", 'url': start_url});

            vtaas.websocket.status.connect();

            if (vtaas.utils.isWorker()) {
                // attach debugger
                sleep(2000);
                attachDebugger();

                // connect websocket
                let ws_path = vtaas.utils.getWsUrl("/subscribe/?testcase=" + vtaas.state.testcaseUuid);
                console.log(ws_path);
                webSocketBridge = new ReconnectingWebSocket(ws_path);
                webSocketBridge.onmessage = function(data) {
                    // Decode the JSON
                    real_data = JSON.parse(data['data']);
                    data_message = JSON.parse(real_data['message']);
                    console.log("Got websocket message", data_message);
                    message = data_message.message;
                    message.sn = data_message.sn
                    parallel_items.push(message);
                    console.log('add message: ', message, parallel_items.length);
                    // replay_one_message(message);
                };
                webSocketBridge.onopen = function(){
                    console.log("websocket open");
                };
            }

            vtaas.messagePort.broadcast(vtaas.message.STATUS_CHANGED, {status: vtaas.constant.STATUS_RUN});
		});
	});
}

function stop_all() {
    // send an END event
    uievent = {
        'client': client_uuid,
        'action': 'end',
        'recordtime': new Date().toISOString()
    };
    recordedEvents.append(uievent);

    vtaas.websocket.status.disconnect();
    if (vtaas.utils.isWorker()) {
        chrome.debugger.detach({tabId: tab_id});
        if (webSocketBridge) {
            webSocketBridge.socket.close(1000, '', {keepClosed: true});
        }
        // clear all events
        parallel_items = new Array();
        current_parallel_event = null;
        last_parallel_eventid = 0;
        parallel_retry_id = 0;
    }

    vtaas.messagePort.broadcast(vtaas.message.STATUS_CHANGED, {status: vtaas.constant.STATUS_STOP});
}

function RunReplayEvents() {
    if (current_replay_event) {
        // check if last event is done
        if (current_replay_event.id == last_replay_eventid) {
            current_replay_event = null;
            last_replay_eventid = 0;
        } else {
            // try again
            console.log('replay again: ', current_replay_event, replay_items.length);
            if (current_replay_event.event == "20") {
                current_replay_event.event = "19";
                replay_one_message(current_replay_event);
                sleep(500);
                current_replay_event.event = "20";
            }
            replay_one_message(current_replay_event);
            setTimeout("RunReplayEvents()", 1000);
            return;
        }
    }

    while (true) {
        // replay another message
        new_message = replay_items.shift();
        if (!new_message) {
            // all done, check again after 2s
            setTimeout("RunReplayEvents()", 2000);
            return;
        }
        if ((new_message.event == "19") || (new_message.action == "open")) {
            setTimeout("RunReplayEvents()", 200);
            break;
        }
        console.log('replay new: ', new_message, replay_items.length);
        if (new_message.event == "24") {
            // current_replay_event = new_message;
            replay_one_message(new_message);
            setTimeout("RunReplayEvents()", 200);
            break;
        } else if (new_message.event == "20") {
            new_message.event = "19";
            replay_one_message(new_message);
            sleep(500);
            new_message.event = "20";
            current_replay_event = new_message;
            replay_one_message(new_message);
            setTimeout("RunReplayEvents()", 500);
            break;
        } else {
            replay_one_message(new_message);
            setTimeout("RunReplayEvents()", 200);
            break;
        }
    }
}

function start_replay(start_url) {
    chrome.tabs.getSelected(null, function(tab) {
        current_tab = tab;
        tab_id = current_tab.id;
        chrome.tabs.update(tab_id, {url: start_url}, function(tab) {
            current_tab = tab;
            tab_id = current_tab.id;
            chrome.debugger.attach({tabId: tab_id}, "1.3", onAttach.bind(null, tab_id));
            chrome.debugger.sendCommand({tabId: tab_id}, 'DOM.enable');
            // record open event
            console.log("replay client: " + client_uuid, tab_id);
        });
    });

    // wait 5 seconds to replay first event
    setTimeout("RunReplayEvents()", 5000);
}

function start_parallel() {
    let client = {
        'uuid': uuidv4(),
        'role': vtaas.state.role,
        'testcase': vtaas.state.testcaseUuid,
        'locale': window.navigator.language,
    }

    serverAddress = vtaas.state.server + ":" + vtaas.state.port;
    // get testcase
    jQueryPostJsonData(
        vtaas.utils.getUrlConnect(),
        client
    ).done(function(data, textStatus, jqXHR) {
        empty = true;
        cid = data.client.id;
        client_uuid = client.uuid;
        vtaas.state.product = data.testcase.product;
        vtaas.state.testType = data.testcase.apptype;
        vtaas.state.locale = data.client.locale;
        vtaas.state.otherServers.accessibility = data.otherServers.accessibility;
        vtaas.state.otherServers.webPageCache = data.otherServers.accessibility.replace('9004', '9008');
        vtaas.state.otherServers.websocket = data.otherServers.websocket;
        let real_start_url = data.testcase.start_url;
        let i = data.testcase.start_url.indexOf('{');
        console.log('real_start_url:', real_start_url, i);
        if (i > 0) {
            real_start_url = data.testcase.start_url.slice(0, i);
            locale_values = JSON.parse(data.testcase.start_url.slice(i));
            console.log('real_start_url:', real_start_url, locale_values);
        }
        // remove text resources support
        // retrieveTextResources(vtaas.state.product, [vtaas.state.locale]);
        start_all(real_start_url);
    }).fail(function(jqXHR, textStatus, errorThrown) {
        console.log("Got testcase failed.")
    });
}

function on_create() {
    chrome.runtime.getPackageDirectoryEntry(function(root) {
        root.getFile("config/default.json", {}, function(fileEntry) {
            fileEntry.file(function(file) {
                var reader = new FileReader();
                reader.onloadend = function(e) {
                    var myFile = JSON.parse(this.result);
                    console.log('background config/default.json', myFile);
                    let server = myFile.server;
                    let address = server.split(':');
                    vtaas.state.server = address[0];
                    vtaas.state.port = address[1];
                    vtaas.state.testcaseUuid = myFile.testcase;
                    vtaas.state.role = myFile.role;
                    vtaas.state.extensionid = myFile.extensionid;
                    autostart = myFile.autostart;
                    replay = myFile.replay;
                    sendverify = myFile.sendverify;
                    consoleid = myFile.consoleid;
                    vtaas.state.workersNumber = myFile.workersnumber;
                    vtaas.state.accessibilityEnabled = myFile.accessibility == 'false' ? false : true;
                    vtaas.state.accessibilityUser = myFile.accessibility_user;
                    vtaas.state.accessibilityPassword = myFile.accessibility_password;

                    console.log(vtaas.state.testcaseUuid, vtaas.state.server, vtaas.state.role, window.navigator.language, replay, sendverify);

                    if (replay == 'true') {
                        // auto start replay
                        client = {
                            'uuid': uuidv4(),
                            'role': vtaas.state.role,
                            'replay': vtaas.state.testcaseUuid,
                            'locale': window.navigator.language,
                        }

                        // get replay
                        jQueryPostJsonData(
                            vtaas.utils.getUrl("/replay/connect/"),
                            client
                        ).done(function(data, textStatus, jqXHR) {
                            console.log("Got replay successfully.", data);
                            empty = true;
                            vtaas.messagePort.broadcast(vtaas.message.STATUS_CHANGED, {status: vtaas.constant.STATUS_RUN});
                            cid = data.client.id;
                            client_uuid = client.uuid;
                            max_parallel_event_retry = client.max_event_retry;
                            var real_start_url = data.replay.start_url;
                            var i = data.replay.start_url.indexOf('{');
                            if (i > 0) {
                                real_start_url = data.replay.start_url.slice(0, i);
                                locale_values = JSON.parse(data.replay.start_url.slice(i));
                                console.log('real_start_url:', real_start_url, locale_values);
                            }
                            // save replay_items
                            replay_items = data.events;
                            start_replay(real_start_url);
                        }).fail(function(jqXHR, textStatus, errorThrown) {
                            console.log("Got replay failed.")
                        });

                    } else if (autostart == 'true') {
                        start_parallel();
                    }
                };
                reader.readAsText(file);
            });
        });
    });
}

on_create();

var webSocketBridge = null;

function finishStepReplay(eventId, sn, result='success', errorMessage='') {
    postReplayedEvent(sn);
}

function getStateValue(variableName, sendResponse) {
    let result;
    if (variableName == 'serverHttpRootUrl') {
        result = "http://" + vtaas.state.server + ":" + vtaas.state.port;
    } else {
        result = vtaas.state[variableName];
    }
    sendResponse({
        value: result
    });
}

function setStateValue(variableName, value, sendResponse) {
    vtaas.state[variableName] = value;
    sendResponse({
        status: "OK"
    });
}

function forwardPostServerData(url, data, sendResponse) {
    if (!url.startsWith('http')) {
        url = vtaas.utils.getUrl(url);
    }
    jQueryPostJsonData(
        url,
        data
    ).done(function(data, textStatus, jqXHR) {
        sendResponse({
            data: data
        });
    }).fail(function(jqXHR, textStatus, errorThrown) {
        sendResponse({
            data: {
                message: textStatus
            }
        });
    });
    return true;
}

function captureFullSizeScreenshot(captureId, postDataToServer, windowInnerRect) {
    const debuggee = {tabId: tab_id};
    let layoutMetrics = {};

    function attachDebugger() {
        chrome.debugger.attach(debuggee, "1.3", function() {
            if (chrome.runtime.lastError) {
                console.error('attach failed: ' + chrome.runtime.lastError.message);
                //return;
            } else {
                console.log('attach succeeded!')
                //chrome.debugger.sendCommand({tabId: tab_id}, 'Page.enable');
            }
            getPageLayout();
        });
    }

    function getPageLayout() {
        chrome.debugger.sendCommand(debuggee,
            'Page.getLayoutMetrics',
            undefined,
            function(result){
                layoutMetrics.contentWidth = Math.ceil(result.contentSize.width);
                layoutMetrics.contentHeight = Math.ceil(result.contentSize.height);
                layoutMetrics.clientWidth = Math.ceil(result.layoutViewport.clientWidth);
                layoutMetrics.clientHeight = Math.ceil(result.layoutViewport.clientHeight);

                setDeviceMetrics();
            }
        );
    }

    function setDeviceMetrics() {
        chrome.debugger.sendCommand(debuggee,
            'Emulation.setDeviceMetricsOverride',
            {
                mobile: false,
                width: windowInnerRect.innerWidth, //layoutMetrics.contentWidth,
                height: layoutMetrics.contentHeight,
                deviceScaleFactor: 0,
                //screenOrientation: {angle: 0, type: 'portraitPrimary'},
            },
            function(){
                captureScreenshot();
            }
        );
    }

    function restoreDeviceMetrics() {
        chrome.debugger.sendCommand(debuggee,
            'Emulation.setDeviceMetricsOverride',
            {
                mobile: false,
                width: windowInnerRect.innerWidth, //layoutMetrics.clientWidth,
                height: windowInnerRect.innerHeight, //layoutMetrics.clientHeight,
                deviceScaleFactor: 0,
                //screenOrientation: {angle: 0, type: 'portraitPrimary'},
            },
            function(){
                //vtaas.messagePort.broadcast(vtaas.message.MSG_CONTROLPANEL_SHOW, null);
            }
        );
    }

    function captureScreenshot() {
        chrome.debugger.sendCommand(debuggee,
            'Page.captureScreenshot',
            {
                format: "png",
                clip: {
                    x: 0,
                    y: 0,
                    width:layoutMetrics.contentWidth,
                    height:layoutMetrics.contentHeight,
                    scale: 1
                },
            },
            function(result){
                restoreDeviceMetrics();
                if (chrome.runtime.lastError) {
                    console.error('captureScreenshot failed: ' + chrome.runtime.lastError.message);
                    return;
                } else {
                    console.log('captureScreenshot succeeded!');
                }

                //console.log('Captured image callback run:' + result.data);
                //alert('Captured image callback run:' + result.data);
                let imageData = 'data:image/png;base64,' + result.data;
                postDataToServer(captureId, imageData);
            }
        );
    }

    attachDebugger();
}

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    // acitons
    if (request.action == "append") {
        recordedEvents.msgAppendHandler(request, sender, sendResponse);
    } else if (request.action == "get_status") {
        sendResponse({'active': vtaas.utils.isRunning(), 'empty': empty,  'pause': vtaas.utils.isPaused(),
                      'role': vtaas.state.role, 'server': vtaas.state.server, 'testcase': vtaas.state.testcaseUuid, state: vtaas.state});
    } else if (request.action == "get_state_value") {
        getStateValue(request.variable, sendResponse);
    } else if (request.action == "set_state_value") {
        setStateValue(request.variable, request.value, sendResponse);
    } else if (request.action == "post-server-data") {
        return forwardPostServerData(request.url, request.data, sendResponse);
    } else if (request.action == "cache-accessibility-page") {
        checkAccessibility();
        sendResponse({result: 'success'})
    } else if (request.action == 'worker-mouse') {
        var mouse_button = 'none';
        if (request.button == '0') {
            mouse_button = 'left'
        }
        if (request.button == '2') {
            mouse_button = 'right';
        }
        var mouse_click = 1;
        var mouse_type = 'mousePressed';
        if (parseInt(request.type) == 20) {
            mouse_type = 'mouseReleased';
        } else if (parseInt(request.type) == 24) {
            mouse_type = 'mouseMoved';
            mouse_click = 0;
        }
        var options = {button: mouse_button,
               clickCount: mouse_click,
               type: mouse_type,
               x: parseFloat(request.x),
               y: parseFloat(request.y)};
        console.log('before despatchMouseEvent: ', tab_id, options);
        chrome.debugger.sendCommand({tabId: tab_id}, 'Input.dispatchMouseEvent', options);
        post_worker_status(request.id, 'success', '');
        finishStepReplay(request.id, request.sn);
        last_replay_eventid = request.id;
        last_parallel_eventid = request.id;
        sendResponse({'result': 'success'});
    } else if (request.action == 'worker-mouse-pass') {
        post_worker_status(request.id, 'success', '');
        finishStepReplay(request.id, request.sn);
        last_replay_eventid = request.id;
        last_parallel_eventid = request.id;
        sendResponse({'result': 'success'});
    } else if (request.action == 'dom-command'){
        var mouse_button = 'none';
        if (request.button == '0') {
            mouse_button = 'left'
        }
        if (request.button == '2') {
            mouse_button = 'right';
        }
        var mouse_click = 1;
        var mouse_type = 'mousePressed';
        if (parseInt(request.type) == 20) {
            mouse_type = 'mouseReleased';
        } else if (parseInt(request.type) == 24) {
            mouse_type = 'mouseMoved';
            mouse_click = 0;
        }

        chrome.debugger.sendCommand({tabId: tab_id}, 'DOM.getDocument', {"depth": -1, "pierce": true}, function(rsp) {
            console.log('replay_mouse_events: ', mouse_button, mouse_click, mouse_type, rsp);
            real_frames = new Array();
            search_real_frames(rsp.root);

            var query_success = 0;
            for (var k = 0; k < real_frames.length; k++){
                chrome.debugger.sendCommand({tabId: tab_id}, 'DOM.querySelector', {
                    "nodeId": real_frames[k].nodeId,
                    "selector": request.selector
                }, function(n) {
                    console.log('DOM.querySelector: ', n);
                    if (n) {
                        var nodeId = n.nodeId;
                        if (nodeId > 0) {
                            console.log("===3===>", real_frames[k].attributes);
                            chrome.debugger.sendCommand({tabId: tab_id}, "DOM.getBoxModel", {
                                "nodeId": nodeId,
                            }, function (box) {
                                console.log("DOM.getBoxModel: ", nodeId, box);
                                if (box) {
                                    var inner_x = box.model.width * parseFloat(request.index_x);
                                    var inner_y = box.model.height * parseFloat(request.index_y);
                                    var options = {
                                        button: mouse_button,
                                        clickCount: mouse_click,
                                        type: mouse_type,
                                        x: parseFloat(box.model.border[0] + inner_x),
                                        y: parseFloat(box.model.border[1] + inner_y)
                                    };
                                    console.log('++++++ despatchMouseEvent: ', tab_id, options);
                                    chrome.debugger.sendCommand({tabId: tab_id}, 'Input.dispatchMouseEvent', options);
                                    if (mouse_type == 'mousePressed') {
                                        options = {
                                            button: mouse_button,
                                            clickCount: mouse_click,
                                            type: 'mouseReleased',
                                            x: parseFloat(box.model.border[0] + inner_x),
                                            y: parseFloat(box.model.border[1] + inner_y)
                                        };
                                        chrome.debugger.sendCommand({tabId: tab_id}, 'Input.dispatchMouseEvent', options);
                                    }
                                    post_worker_status(request.id, 'success', '');
                                    finishStepReplay(request.id, request.sn);
                                    if (replay == "false") {
                                        last_parallel_eventid = request.id;
                                    } else {
                                        last_replay_eventid = request.id;
                                    }
                                }
                            });
                        }
                    }
                });
            }

        });
    } else if (request.action == "start") {
        console.log("background.start", request);
        if(vtaas.utils.isStopped()) {
            start_parallel();
            sendResponse({success: true});
        }
    } else if (request.action == "refresh") {
        console.log("background.refresh", request);
        uievent = {
            'client': client_uuid,
            'event': "17",
            'action': 'refresh',
            'recordtime': new Date().toISOString()
        };
        recordedEvents.append(uievent);
    }  else if (request.action=="report_issue"){
        console.log("background.report_issue",request);
        // send a report issue event
        uievent={
            'client':client_uuid,
            'event':"25",
            'action':'report_issue',
            'obj_text':request.message,
            'recordtime': new Date().toISOString()
        };
        recordedEvents.append(uievent);
    } else if (request.action == "unlocal_check") {
        console.log("background.unlocal_check", request);

        chrome.tabs.executeScript({
            code: jsCodeStr,
            allFrames: true
        }, function(allText) {
            if (chrome.runtime.lastError) {
                /* Report any error */
                alert('ERROR:\n' + chrome.runtime.lastError.message);
            } else if ((allText.length > 0)) {
                console.log('allText:', allText[0]);
                uievent = {
                    'client': client_uuid,
                    'event': "16",
                    'recordtime': new Date().toISOString(),
                    'action': 'unlocal_check',
                    'verify_type': 'unlocal_check',
                    'verify_value': allText[0],
                };
                recordedEvents.append(uievent);
            }
        });
    } else if (request.action == "stop") {
        stop_all();
        sendResponse({});
    } else if (request.action == "pause") {
        vtaas.messagePort.broadcast(vtaas.message.STATUS_CHANGED, {status: vtaas.constant.STATUS_PAUSE});
        sendResponse({});
    } else if (request.action == "resume") {
        vtaas.messagePort.broadcast(vtaas.message.STATUS_CHANGED, {status: vtaas.constant.STATUS_RUN});
        sendResponse({});
    } else if (request.action == "get_items") {
        sendResponse({'items': testcase_items});
    } else if (request.action == "worker-status") {
        console.log("worker-status: ", request);
        if (request.event_action) {
            post_worker_status(request.event_id, request.status, request.message, request.event_action);
        } else {
            post_worker_status(request.event_id, request.status, request.message);
        }
    } else if (request.action == "replay-step-finished") {
        finishStepReplay(request.data.id, request.data.sn, request.data.result, request.data.errorMessage);
    } else if (request.action == "capture") {
        function postData(captureId, image) {
            let captureData = {
                'captureid': captureId,
                'consoleid': consoleid,
                'img':image,
            }
            jQueryPostJsonData(
                vtaas.utils.getUrl("/parallel/capture/"),
                captureData
            ).done(function(data, textStatus, jqXHR){
                let curr_time=new Date().toISOString().slice(0,19);
                console.log("Capture done: ", captureId, curr_time);
            }).fail(function(jqXHR, textStatus, errorThrown){
                console.log("Capture failed: ", captureId, curr_time);
            });
        }
        if (vtaas.utils.isLeader()) {
            let captureId = request.message;

            if (request.areaType == 'fullpage') {
                captureFullSizeScreenshot(captureId, postData, request.windowInnerRect);
            } else {
                chrome.tabs.captureVisibleTab(null,{format:'png'},function(img){
                    //vtaas.messagePort.broadcast(vtaas.message.MSG_CONTROLPANEL_SHOW, null);
                    if (!chrome.runtime.lastError){
                        if (request.areaType == 'element') {
                            cropImage(img, request.rect).then(function(croppedImage) {
                                postData(captureId, croppedImage);
                            });
                        } else {
                            postData(captureId, img)
                        }
                    }
                });
            }
        }
    }
});

mouseOverProcessor = {
    lastEvent: null,
    timeoutId: -1,

    init: function() {
        vtaas.message.on(vtaas.message.MSG_MOUSEOVER_RECORD, (msg) => {
            if (!msg.mouseOverOn) {
                this.clearEvent(-1);
            }
        });
    },

    resetLastEvent: function(newEvent) {
        this.lastEvent = newEvent;
        if (this.timeoutId !== -1) {
            clearTimeout(this.timeoutId);
            this.timeoutId = -1;
        }
        this.timeoutId = setTimeout(() => {
            this.sendLastEvent();
        }, vtaas.state.mouseOverWaitTime * 1000);
    },

    clearEvent: function(eventType) {
        if (eventType === 9 || eventType === 10 || eventType === 19 || eventType === 20 || eventType === -1) {
            if (this.lastEvent) {
                this.lastEvent = null;
            }
            if (this.timeoutId !== -1) {
                clearTimeout(this.timeoutId);
                this.timeoutId = -1;
            }
        }
    },

    sendLastEvent: function() {
        if (this.lastEvent) {
            if ((vtaas.utils.isLeader()) && vtaas.utils.isRunning()) {
                recordedEvents.append(this.lastEvent);
                console.log('Recorded mouseover event:', this.lastEvent);
                vtaas.messagePort.broadcast(vtaas.message.MSG_SHOW_ALERT, {message: 'MouseOver event recorded!'});
                this.lastEvent = null;
                this.timeoutId = -1;
            }
        }
    },
};
mouseOverProcessor.init();

const axiosHttpClient = {
    get(url) {
        return axios.get(url).then(function (result) {
            return result.data;
          }).catch(function(error) {
            console.error(`An error happend in the get request for ${url}`);
            if (error.response) {
                console.error(error.response.data);
                console.error(error.response.status);
            } else if (error.request) {
                console.error(error.request);
            } else {
                console.error('Error', error.message);
            }
                console.error(error.config);
            return {message: 'fail', data: 'An error happend for the request'};
        });
    },

    post(url, data) {
        return axios.post(url, data).then(function (result) {
            return result.data;
          }).catch(function(error) {
            console.error(`An error happend in the post request for ${url}`);
            if (error.response) {
                console.error(error.response.data);
                console.error(error.response.status);
            } else if (error.request) {
                console.error(error.request);
            } else {
                console.error('Error', error.message);
            }
                console.error(error.config);
            return {message: 'fail', data: 'An error happend for the request'};
        });
    },
};

async function checkAccessibility() {
    if (!vtaas.utils.getUrlAccessibilityBase()) {
        console.error('Accessbility server not configured.');
        return;
    }
    if (vtaas.state.waveTaskId === null) {
        let creatingWaveTaskData = {
            appType: 'accessibility-record',
            testcaseUuid: vtaas.state.testcaseUuid,
        };
        let creatingWaveTaskResult = await axiosHttpClient.post(vtaas.utils.getUrlAccessibilityCreatingWaveTask(), creatingWaveTaskData);
        if (creatingWaveTaskResult.message && creatingWaveTaskResult.message === 'fail') {
            console.error(`Failed to create wave task: ${creatingWaveTaskResult.data}`);
            return;
        }
        vtaas.state.waveTaskId = creatingWaveTaskResult.data.waveTaskId;
    }

    if (vtaas.state.captureScript === null) {
        let result = await axiosHttpClient.get(vtaas.utils.getUrlPageCacheDomCatchingScript());
        if (result.message && result.message === 'fail') {
            return;
        } else {
            vtaas.state.captureScript = '(function(){' + result + '})();';
        }
    }

    function chromeExecuteScript(scriptCode) {
        let promise = new Promise((resolve, reject) => {
            chrome.tabs.executeScript({code: scriptCode, allFrames:false}, function(pageData){
                if(chrome.runtime.lastError){
                    console.error('Failed to capture DOM by executing script:\n'+chrome.runtime.lastError.message);
                    resolve({message: 'fail', data: chrome.runtime.lastError.message})
                }
                resolve(pageData[0]);
            });
        });
        return promise;
    }
    let capturedPage = await chromeExecuteScript(vtaas.state.captureScript);
    if (capturedPage.message && capturedPage.message === 'fail') {
        return;
    }
    let capturedPageObject=JSON.parse(capturedPage);

    let cachePageData = {
        dom: capturedPage,
        waveTaskId: vtaas.state.waveTaskId
    };
    let cachePageResult = await axiosHttpClient.post(vtaas.utils.getUrlPageCacheDomData(), cachePageData);
    if (cachePageResult.message && cachePageResult.message === 'fail') {
        console.error('Failed to request web page cache server for page caching');
        return;
    }

    // Send cached page url to accessibility server
    let checkPageData = {
        url: cachePageResult.data.indexFileUrl,
        pageUrl: capturedPageObject.pageUrl,
        iframesInfo: cachePageResult.data.iframesInfo
    };
    let checkPageResponse = await axiosHttpClient.post(
        vtaas.utils.getUrlAccessibilityCheckPage(vtaas.state.waveTaskId),
        checkPageData);
    if (checkPageResponse.message && checkPageResponse.message === 'fail') {
        console.error(`Failed to check accessibility for page ${cachePageResult.data.indexFileUrl}`);
        return;
    }
    console.log(`Successful to check accessibility for page ${cachePageResult.data.indexFileUrl}`);
};

vtaas.messagePort = {
    mapPorts: {},
    maxPortId: 0,

    init: function() {
        chrome.runtime.onConnect.addListener((port) => {
            if (port.name === 'replay-progress') {
                return;
            }
            let portId = this.maxPortId++;
            this.mapPorts[portId] = port;
            let tabId = port.sender.tab.id;
            port.onMessage.addListener((msg) => {
                this.broadcast(msg.type, msg.data, tabId);
            });
            port.onDisconnect.addListener((port) => {
                delete this.mapPorts[portId];
            });
        });
    },

    broadcast: function(type, data, targetTabId) {
        console.log('broadcast message, type: ' + type, data);
        vtaas.message.emit(type, data);

        msg = {type: type, data: data};
        targetTabId = targetTabId ? targetTabId : current_tab.id;
        // if (!targetTabId) {
        //     chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
        //         this._broadcast(msg, tabs[0].id);
        //     });
        // } else {
        //     this._broadcast(msg, targetTabId)
        // }
        this._broadcast(msg, targetTabId)
    },

    _broadcast: function(msg, targetTabId) {
        for(var portId in this.mapPorts){
            let port = this.mapPorts[portId];
            let tabId = port.sender.tab.id;
            // Send the message back to the sender tab, all the port (including port in iframe)
            // will receive it.
            if(targetTabId !== undefined && targetTabId === tabId){
                port.postMessage(msg);
            }
        }
    }
};

vtaas.progressPort = {
    dialogPort: null,
    replayedEvents: new Map(),

    init: function() {
        chrome.runtime.onConnect.addListener((port) => {
            if (port.name === 'replay-progress') {
                if (this.dialogPort !== null) {
                    console.error('The progress port already exists');
                    return;
                }
                this.dialogPort = port;
                port.onDisconnect.addListener((port) => {
                    console.info('The progress port disconnected');
                    this.dialogPort = null;
                });

                // When the page is reloaded, send the last replay status
                this.replayedEvents.forEach((value, key, map) => {
                    this.postMessage(value);
                })
            }
        });
    },

    postMessage: function(msg) {
        this.replayedEvents.set(msg.clientUuid, msg);
        if (this.dialogPort) {
            this.dialogPort.postMessage(msg);
        }
    }
};
vtaas.progressPort.init();

chrome.tabs.onCreated.addListener(function(newtab){
    chrome.tabs.query({}, function(tabs) {
        var remove_tabids = [];
        var max_tabid = -1;
        var max_tab = null;
        console.log('TAB created: ', tabs, newtab, tabs.length);
        for(var i=0; i<tabs.length; i++) {
            if (tabs[i].url) {
                if (tabs[i].url.indexOf('chrome://') == 0){
                    continue;
                }
            } else if (tabs[i].pendingUrl) {
                if (tabs[i].pendingUrl.indexOf('chrome://') == 0) {
                    continue;
                }
            }
            remove_tabids.push(tabs[i].id);
            if (tabs[i].id > max_tabid) {
                max_tabid = tabs[i].id;
                max_tab = tabs[i];
            }
        }
        // fill remove_tabids
        var index = remove_tabids.indexOf(max_tabid);
        if (index > -1) {
            remove_tabids.splice(index, 1);
        }

        // switch tab
        if (remove_tabids.length > 0) {
            uievent = {
                'client': client_uuid,
                'event': '33',
                'action': '',
                'recordtime': new Date().toISOString()
            };
            recordedEvents.append(uievent);

            // chrome.debugger.detach({tabId: tab_id});
            current_tab = max_tab;
            tab_id = max_tabid;
            chrome.debugger.attach({tabId: tab_id}, "1.3", onAttach.bind(null, tab_id));
            chrome.debugger.sendCommand({tabId: tab_id}, 'DOM.enable');

            // remove tabs
            for(var i=0; i<remove_tabids.length; i++) {
                chrome.tabs.remove(remove_tabids[i]);
            }
        }
    });
    chrome.tabs.query({}, function(tabs) {
        console.log('TAB removed: ', tabs, tabs.length);
    });
});

chrome.browserAction.onClicked.addListener(function(tab) {
    current_tab = tab;

    function sendPanelMsg() {
        vtaas.messagePort.broadcast(vtaas.message.FLOATPANEL_DISPLAY_CHANGED, {
            display: vtaas.state.floatPanelDisplay === 'show' ? 'hide' : 'show'
        });
    }
    // Chrome new tab page can not run content script, this is a workaround.
    if (tab.url === "chrome://newtab/") {
        let redirectPage = 'https://www.baidu.com/';
        chrome.tabs.update(tab.id, {url: redirectPage}, function() {
            // Wait three seconds for the page to be loaded
            setTimeout(sendPanelMsg, 3000);
        });
    } else {
        sendPanelMsg();
    }

});

chrome.runtime.onInstalled.addListener(function() {
    const inputTexts = new Map([
        ['ss', ['Super string', '表ポあA中Œ鷗停B逄1�7']],
        ['zh-CN', ['Simplified Chinese', '测试工具维塔斄1�7']],
        ['zh-TW', ['Traditional Chinese', '功懸繁體 字總衄1�7']],
        ['ja', ['Japanese', '株sいうい1�7 おサシ園か゚アｱ＄1�71ａa']],
        ['ko', ['Korean', 'ㄱㄷㅑㅓ필1�7 늘천따겨울연갢�']],
        ['cyrs', ['Cyrillic', 'АБВГДЕЖфхцчшщъыьэюяё']],
        ['cs', ['Czech', 'Češi udělali']],
        ['ar', ['Arabic (RTL)', 'اللغة abcالعربِية لغة جميلة.']],
        ['vi', ['Vietnamese', 'ằỰịÌỈỵỲỶđĐ₫Ư̄1�7']]
    ]);

    function nainputSubMenuHandler(info, tab) {
        const key = info.menuItemId.substring('nainput-'.length);
        chrome.tabs.sendMessage(tab.id, {action: "nainput", nastring: inputTexts.get(key)[1]});
    }
    function createNainputSubMenu() {
        for (var [key, value] of inputTexts.entries()) {
            chrome.contextMenus.create({
                id: 'nainput-' + key,
                title: value[0],
                type: 'normal',
                contexts: ['editable'],
                parentId: 'nainput-root',
                onclick: nainputSubMenuHandler
            });
        }
    }
    function createNainputRootMenu() {
        chrome.contextMenus.create({
            id: 'nainput-root',
            title: 'Non-ASCII Strings',
            type: 'normal',
            contexts: ['editable'],
            parentId: 'root'
        }, function() {
            createNainputSubMenu();
        });
    }

    chrome.contextMenus.create({
        id: 'root',
        title: 'VTaaS',
        type: 'normal',
        contexts: ['all'],
    }, function() {
        createNainputRootMenu();
    });
});

// Do init work
vtaas.messagePort.init();
//////////////////////////////////////////////////////////////////////////////
