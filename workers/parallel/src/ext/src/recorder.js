
// Copyright 2022 VMware, Inc.
// SPDX-License-Identifier: Apache License 2.0

Object.assign(vtaas.state, {
    // content script specific state
    //mouseOverOn: false,
});

var prodjs = null;
var prodjs_name = 'default.js';
const configurl = chrome.runtime.getURL('config/default.json');
fetch(configurl)
    .then((response) => response.json()) //assuming file contains json
    .then((json) => {
        console.log(json);
        prodjs_name = json.prodjs;
        console.log('prodjs_name -->', prodjs_name);

        (async () => {
            try {
                const src = chrome.extension.getURL('src/product/' + prodjs_name);
                prodjs = await import(src);
            } catch(err) {
                prodjs = null;
                console.log('Import prodjs failed: ', err.message);
            }
        })();
    });

if (!window.frameElement) {
    // main frame
    console.log('Content Script Start:', new Date().toLocaleString());
    chrome.runtime.sendMessage({action: "worker-status", 'event_id': 0, 'status': 'script-start', 'message': ''});
}

// re-write browser native prompt function
var vtaas_alert_properties = document.createElement("script");
vtaas_alert_properties.id = 'vtaas_alert_properties';
vtaas_alert_properties.innerHTML = 'var vtaas_alert_properties = "";';
(document.head||document.documentElement).appendChild(vtaas_alert_properties);

var my_alert = document.createElement("script");
my_alert.innerHTML = 'var _alert = window.alert;window.alert = function(msg){console.log(msg); _alert(msg); var evt=document.createEvent("Event"); evt.initEvent("browserprompt", true, true); document.getElementById("vtaas_alert_properties").setAttribute("ptype", "alert"); document.getElementById("vtaas_alert_properties").setAttribute("result", ""); window.dispatchEvent(evt);};';
(document.head||document.documentElement).appendChild(my_alert);

var my_confirm = document.createElement("script");
my_confirm.innerHTML = 'var _confirm = window.confirm;window.confirm = function(msg){console.log(msg); var _result = _confirm(msg); var evt=document.createEvent("Event"); evt.initEvent("browserprompt", true, true); document.getElementById("vtaas_alert_properties").setAttribute("ptype", "confirm"); document.getElementById("vtaas_alert_properties").setAttribute("result", _result); window.dispatchEvent(evt); return _result; };';
(document.head||document.documentElement).appendChild(my_confirm);

var my_prompt = document.createElement("script");
my_prompt.innerHTML = 'var _prompt = window.prompt;window.prompt = function(msg){console.log(msg); var _result = _prompt(msg); if (!_result) {_result = "";} var evt=document.createEvent("Event"); evt.initEvent("browserprompt", true, true); document.getElementById("vtaas_alert_properties").setAttribute("ptype", "prompt"); document.getElementById("vtaas_alert_properties").setAttribute("result", _result); window.dispatchEvent(evt); return _result; };';
(document.head||document.documentElement).appendChild(my_prompt);


// var onbrowserprompt = document.createElement("script");
// onbrowserprompt.innerHTML = 'document.addEventListener("onbrowserprompt", function(e){console.log("onbrowserprompt: ", e.ptype);}, false);';
// (document.head||document.documentElement).appendChild(onbrowserprompt);

if (typeof(TestRecorder) == "undefined") {
    TestRecorder = {};
}

function uuidv4() {
    return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c =>
      (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
    )
  }

function sleep(miliseconds) {
    var currentTime = new Date().getTime();
    while (currentTime + miliseconds >= new Date().getTime()) {
    }
 }

//---------------------------------------------------------------------------
// Browser -- a singleton that provides a cross-browser API for managing event
//      handlers and miscellaneous browser functions.

// Methods:
// captureEvent(window, name, handler) -- capture the named event occurring
//      in the given window, setting the function handler as the event handler.
//      The event name should be of the form "click", "blur", "change", etc.

// releaseEvent(window, name, handler) -- release the named event occurring
//      in the given window. The event name should be of the form "click", "blur",
//      "change", etc.

// getSelection(window) -- return the text currently selected, or the empty
//      string if no text is currently selected in the browser.
//---------------------------------------------------------------------------

if (typeof(TestRecorder.Browser) == "undefined") {
    TestRecorder.Browser = {};
}

TestRecorder.Browser.captureEvent = function(wnd, name, func) {
    var lname = name.toLowerCase();
    var doc = wnd.document;
    wnd.captureEvents(Event[name.toUpperCase()]);
    wnd["on" + lname] = func;
}

TestRecorder.Browser.releaseEvent = function(wnd, name, func) {
    var lname = name.toLowerCase();
    var doc = wnd.document;
    wnd.releaseEvents(Event[name.toUpperCase()]);
    wnd["on" + lname] = null;
}

TestRecorder.Browser.getSelection = function(wnd) {
    var doc = wnd.document;
    if (wnd.getSelection) {
        return wnd.getSelection() + "";
    }
    else if (doc.getSelection) {
        return doc.getSelection() + "";
    }
    else if (doc.selection && doc.selection.createRange) {
        return doc.selection.createRange().text + "";
    }
    return "";
}

TestRecorder.Browser.windowHeight = function(wnd) {
    var doc = wnd.document;
    if (wnd.innerHeight) {
        return wnd.innerHeight;
    }
    else if (doc.documentElement && doc.documentElement.clientHeight) {
        return doc.documentElement.clientHeight;
    }
    else if (document.body) {
        return document.body.clientHeight;
    }
    return -1;
}

TestRecorder.Browser.windowWidth = function(wnd) {
    var doc = wnd.document;
    if (wnd.innerWidth) {
        return wnd.innerWidth;
    }
    else if (doc.documentElement && doc.documentElement.clientWidth) {
        return doc.documentElement.clientWidth;
    }
    else if (document.body) {
        return document.body.clientWidth;
    }
    return -1;
}


//---------------------------------------------------------------------------
// Event -- a class that provides a cross-browser API dealing with most of the
//      interesting information about events.

// Methods:
// type() -- returns the string type of the event (e.g. "click")
// target() -- returns the target of the event
// button() -- returns the mouse button pressed during the event. Because
//      it is not possible to reliably detect a middle button press, this method
//      only recognized the left and right mouse buttons. Returns one of the
//      constants Event.LeftButton, Event.RightButton or Event.UnknownButton for
//      a left click, right click, or indeterminate (or no mouse click).
// keycode() -- returns the index code of the key pressed. Note that this
//      value may differ across browsers because of character set differences.
//      Whenever possible, it is suggested to use keychar() instead.

// keychar() -- returns the char version of the key pressed rather than a
//      raw numeric code. The resulting value is subject to all of the vagaries
//      of browsers, character encodings in use, etc.
// shiftkey() -- returns true if the shift key was pressed.
// posX() -- return the X coordinate of the mouse relative to the document.
// posY() -- return the y coordinate of the mouse relative to the document.
// stopPropagation() -- stop event propagation (if supported)
// preventDefault() -- prevent the default action (if supported)
//---------------------------------------------------------------------------

TestRecorder.Event = function(e) {
    this.event = (e) ? e : window.event;
}

TestRecorder.Event.LeftButton = 0;
TestRecorder.Event.MiddleButton = 1;
TestRecorder.Event.RightButton = 2;
TestRecorder.Event.UnknownButton = 3;

TestRecorder.Event.prototype.stopPropagation = function() {
    if (this.event.stopPropagation)
        this.event.stopPropagation();
}

TestRecorder.Event.prototype.preventDefault = function() {
    if (this.event.preventDefault)
        this.event.preventDefault();
}

TestRecorder.Event.prototype.type = function() {
    return this.event.type;
}

TestRecorder.Event.prototype.button = function() {
    if (this.event.button) {
        if (this.event.button == 2) {
            return TestRecorder.Event.RightButton;
        }
        return TestRecorder.Event.LeftButton;
    }
    else if (this.event.which) {
        if (this.event.which > 1) {
            return TestRecorder.Event.RightButton;
        }
        return TestRecorder.Event.LeftButton;
    }
    return TestRecorder.Event.UnknownButton;
}

TestRecorder.Event.prototype.target = function() {
    var t = (this.event.target) ? this.event.target : this.event.srcElement;
    if (t && t.nodeType == 3) // safari bug
        return t.parentNode;
    return t;
}

TestRecorder.Event.prototype.keycode = function() {
    return (this.event.keyCode) ? this.event.keyCode : this.event.which;
}

TestRecorder.Event.prototype.code = function() {
    return (this.event.code) ? this.event.code : this.event.which;
}

TestRecorder.Event.prototype.keychar = function() {
    return String.fromCharCode(this.keycode());
}

TestRecorder.Event.prototype.shiftkey = function() {
    if (this.event.shiftKey)
        return true;
    return false;
}

TestRecorder.Event.prototype.altKey = function() {
    if (this.event.altKey)
        return true;
    return false;
}

TestRecorder.Event.prototype.ctrlKey = function() {
    if (this.event.ctrlKey)
        return true;
    return false;
}

TestRecorder.Event.prototype.posX = function() {
    if (this.event.pageX)
        return this.event.pageX;
    else if (this.event.clientX) {
        return this.event.clientX + document.body.scrollLeft;
    }
    return 0;
}

TestRecorder.Event.prototype.posY = function() {
    if (this.event.pageY)
        return this.event.pageY;
    else if (this.event.clientY) {
        return this.event.clientY + document.body.scrollTop;
    }
    return 0;
}

//---------------------------------------------------------------------------
// TestCase -- this class contains the interesting events that happen in
//      the course of a test recording and provides some testcase metadata.

// Attributes:
// title -- the title of the test case.
// items -- an array of objects representing test actions and checks
//---------------------------------------------------------------------------

TestRecorder.TestCase = function() {
    this.title = "Test Case";
    // maybe some items are already stored in the background
    // but we do not need them here anyway
    this.items = new Array();
}

TestRecorder.TestCase.prototype.append = function(o) {
    this.items[this.items.length] = o;
    chrome.runtime.sendMessage({action: "append", obj: o});
}

TestRecorder.TestCase.prototype.peek = function() {
    return this.items[this.items.length - 1];
}

TestRecorder.TestCase.prototype.poke = function(o) {
    this.items[this.items.length - 1] = o;
    chrome.runtime.sendMessage({action: "poke", obj: o});
}


//---------------------------------------------------------------------------
// Event types -- whenever an interesting event happens (an action or a check)
//      it is recorded as one of the object types defined below. All events have a
//      'type' attribute that marks the type of the event (one of the values in the
//      EventTypes enumeration) and different attributes to capture the pertinent
//      information at the time of the event.
//---------------------------------------------------------------------------

if (typeof(TestRecorder.EventTypes) == "undefined") {
    TestRecorder.EventTypes = {};
}

TestRecorder.EventTypes.OpenUrl = 0;
TestRecorder.EventTypes.Click = 1;
TestRecorder.EventTypes.Change = 2;
TestRecorder.EventTypes.Comment = 3;
TestRecorder.EventTypes.Submit = 4;
TestRecorder.EventTypes.KeyDown = 9;
TestRecorder.EventTypes.KeyUp = 10;
TestRecorder.EventTypes.Input = 11;
TestRecorder.EventTypes.UnlocalCheck = 16;
TestRecorder.EventTypes.PageLoad = 17;
TestRecorder.EventTypes.ScreenShot = 18;
TestRecorder.EventTypes.MouseDown = 19;
TestRecorder.EventTypes.MouseUp = 20;
TestRecorder.EventTypes.MouseDrag = 21;
TestRecorder.EventTypes.MouseDrop = 22;
TestRecorder.EventTypes.KeyPress = 23;
TestRecorder.EventTypes.MouseOver = 24;
TestRecorder.EventTypes.ReportIssue = 25;
TestRecorder.EventTypes.Assert = 26;
TestRecorder.EventTypes.Execute = 27;
TestRecorder.EventTypes.Accessibility = 28;
TestRecorder.EventTypes.BrowserPrompt = 29;
TestRecorder.EventTypes.TabSwitch = 33;

function getElementXpath3(element) {
    // if get an iframe xpath, the doument object will be parent window's document
    let ownerDocument = element.ownerDocument;
    let excludedChildNodes = [];
    // For parent nodes, it don't need check the text that already checked in child node
    let alreadyFoundText = [];
    // Currently only allow a single xpath node to caintain text
    let stopContainText = false;

    function isXpathUnique(contextNode, xpath){
        let result = ownerDocument.evaluate(xpath, contextNode, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
        return result.snapshotLength === 1;
    }

    function getXpathMatchNumber(contextNode, xpath){
        let result = ownerDocument.evaluate(xpath, contextNode, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
        return result.snapshotLength;
    }

    function joinXpath(...xpathParts) {
        return xpathParts.map(v => v.trim()).filter( v => v.length > 0).join('/');
    }

    function isAutoGeneratedValue(value) {
        let numberPattern = /\d/;
        if (numberPattern.test(value)) {
            return true;
        }
        return false;
    }

    function makeAttrFilterString(key, value) {
        return `[@${key}="${value}"]`;
    }

    function makeContainTextFilterString(element) {
        let result = '';
        const andOperator = ' and ';
        let textNodesCount = 0;

        let textNodes = document.evaluate('.//text()', element, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
        if (textNodes.snapshotLength > 20) {
            return null;
        }
        for (let i = 0; i < textNodes.snapshotLength; i++) {
            let currentTextNode = textNodes.snapshotItem(i);
            if (currentTextNode.parentNode && currentTextNode.parentNode.nodeType === Node.ELEMENT_NODE &&
                    currentTextNode.parentNode.tagName === 'SCRIPT') {
                continue;
            }
            let textContent = currentTextNode.textContent.trim();
            textContent = textContent.replace(/"/g, '');
            if (textContent.length > 0 && alreadyFoundText.indexOf(textContent) === -1) {
                alreadyFoundText.push(textContent);
                let relationStr = result.length > 0 ? andOperator : '';
                result = result + `${relationStr}contains(translate(., '"', ""), "${textContent}")`;
                if (++textNodesCount > 2) {
                    break;
                }
            }
        }

        return (result.length > 0) ? `[${result}]` : null;
    }

    function makeAttrFilterInt(key, value) {
        return `[@${key}=${value}]`;
    }

    function makeAttrFilterContain(key, values, isOr) {
        let result = '';
        let relation = ' and ';
        if (isOr) {
            relation = ' or ';
        }
        values.forEach(function(v) {
            let relationStr = result.length > 0 ? relation : '';
            result = result + `${relationStr}contains(@${key}, "${v}")`;
          });
        return `[${result}]`;
    }

    function getSelfPartXpath(element) {
        function isAppendedAttrFilterUnique(element, AttrName, checkAutoGeneration, result) {
            let attrValue = element.getAttribute(AttrName);
            //console.log('Attribute data in getSelfPartXpath:', AttrName, attrValue, result);
            if (attrValue && (!checkAutoGeneration || !isAutoGeneratedValue(attrValue))) {
                result.xpath += makeAttrFilterString(AttrName, attrValue);
                if (isXpathUnique(ownerDocument, '//' + result.xpath)) return true;
            }
            return false
        }

        let id = element.id;
        let tagName = element.tagName;
        let result = {xpath: tagName};

        if (isAppendedAttrFilterUnique(element, 'id', true, result)) return result.xpath;
        if (isAppendedAttrFilterUnique(element, 'automation-id', false, result)) return result.xpath;
        if (isAppendedAttrFilterUnique(element, 'name', true, result)) return result.xpath;
        // if (isAppendedAttrFilterUnique(element, 'src', false, result)) return result.xpath;
        if (isAppendedAttrFilterUnique(element, 'href', true, result)) return result.xpath;
        if (isAppendedAttrFilterUnique(element, 'type', false, result)) return result.xpath;
        if (isAppendedAttrFilterUnique(element, 'alt', false, result)) return result.xpath;
        if (isAppendedAttrFilterUnique(element, 'for', true, result)) return result.xpath;
        // for clr-icon:shape
        if (isAppendedAttrFilterUnique(element, 'shape', false, result)) return result.xpath;

        if (!stopContainText) {
            let textFilter = makeContainTextFilterString(element);
            if (textFilter) {
                stopContainText = true;
                result.xpath += textFilter;
                if (isXpathUnique(ownerDocument, '//' + result.xpath)) return result.xpath;
            }
        }
        // let className = element.getAttribute('class');
        // if (className) {
        //     let classNameArray = className.split(' ');
        //     classNameArray = classNameArray.map(v => v.trim()).filter(v => v.length > 0 && !isAutoGeneratedValue(v));
        //     if (classNameArray.length > 0) {
        //         result.xpath += makeAttrFilterContain('class', classNameArray);
        //         if (isXpathUnique(ownerDocument, '//' + result.xpath)) return result.xpath;
        //     }
        // }

        return result.xpath;
    }

    function getFirstLevelChildrenElement(element) {
        let children = [];
        for (let i = 0; i < element.childNodes.length; i++) {
            if(element.childNodes[i].nodeType === Node.ELEMENT_NODE){
                children.push(element.childNodes[i]);
            }
        }
        return children;
    }

    // Breadth-first traversal child nodes
    function getOtherChildUniqueXpath(element, /*elementParent,*/ elementXpath, childrenXpath, isSiblingUnique) {
        let levelSeperator = new Object();
        let currentLevel = 0;
        let totalNodes = 0;
        let nodeQueue = getFirstLevelChildrenElement(element);
        nodeQueue.push(levelSeperator);

        //let bestNumber = -1;
        //let bestNode = null;
        //let bestXpath = elementXpath;
        let testedOtherXpaths = [];
        while (nodeQueue.length > 0 && currentLevel < 2 && totalNodes < 5) {
            let otherElement = nodeQueue.shift();
            if (otherElement === levelSeperator) {
                currentLevel++;
                nodeQueue.push(levelSeperator);
                continue;
            }

            if (excludedChildNodes.indexOf(otherElement) !== -1) {
                continue
            }
            excludedChildNodes.push(otherElement);
            nodeQueue = nodeQueue.concat(getFirstLevelChildrenElement(otherElement));
            totalNodes++;
            let otherXpath = getSelfPartXpath(otherElement);
            if (testedOtherXpaths.indexOf(otherXpath) !== -1) {
                continue
            }
            testedOtherXpaths.push(otherXpath);
            //let childrenXpathFilter = childrenXpath ? `[${childrenXpath}]` : '';

            if (isSiblingUnique) {
                let newXpath = joinXpath(`${elementXpath}[.//${otherXpath}]`, childrenXpath);
                if (isXpathUnique(element.parentNode, newXpath)) {
                    excludedChildNodes.push(otherElement);
                    return otherXpath;
                }
            } else {
                let newXpath = joinXpath(`//${elementXpath}[.//${otherXpath}]`, childrenXpath);
                if (isXpathUnique(ownerDocument, newXpath)) return otherXpath;
            }

            // let matchNumber = getXpathMatchNumber(ownerDocument, newXpath);
            // if (bestNumber === -1 || (matchNumber != 0 && matchNumber < bestNumber)) {
            //     bestXpath = `${elementXpath}[.//${otherXpath}]`;
            //     bestNode = otherElement;
            // }
            // if (matchNumber === 1) {
            //     break;
            // }
        }
        return null;
    }

    function getSelfUniqueXpathInSibling(element, elementXpath, childrenXpath) {
        let parentElement = element.parentNode;
        let fullXpath = joinXpath(`${elementXpath}`, childrenXpath);
        if (isXpathUnique(parentElement, fullXpath)) return elementXpath;

        let otherChildXpath = null;//getOtherChildUniqueXpath(element, elementXpath, childrenXpath, true);
        if (otherChildXpath !== null) return `${elementXpath}[.//${otherChildXpath}]`;

        let siblingIndex = 1;
        let siblings= parentElement.childNodes;
        for (let i = 0; i < siblings.length; i++) {
            //var sibling= siblings[i];
            if (siblings[i] === element)
                break;
            if (siblings[i].nodeType === Node.ELEMENT_NODE && siblings[i].tagName === element.tagName) {
                siblingIndex++;
            }
        }
        return `${element.tagName}[${siblingIndex}]`;
    }

    function getXpath(element, childrenXpath) {
        excludedChildNodes.push(element);

        if (!childrenXpath) {
            childrenXpath = '';
        }
        if (element.tagName == 'HTML')
            return joinXpath('/HTML[1]', childrenXpath);
        if (element===ownerDocument.body)
            return joinXpath('/HTML[1]/BODY[1]', childrenXpath);
        if (!element)
            return joinXpath('', childrenXpath);

        let selfXpath = getSelfPartXpath(element);
        let fullXpath = joinXpath(`//${selfXpath}`, childrenXpath);
        if (isXpathUnique(ownerDocument, fullXpath)) return fullXpath;

        let otherChildXpath = getOtherChildUniqueXpath(element, selfXpath, childrenXpath, false);
        if (otherChildXpath) {
            return joinXpath(`//${selfXpath}[.//${otherChildXpath}]`, childrenXpath);
        }
        //fullXpath = joinXpath(`//${selfXpath}`, childrenXpath);
        //if (isXpathUnique(ownerDocument, fullXpath)) return fullXpath;

        selfXpath = getSelfUniqueXpathInSibling(element, selfXpath, childrenXpath);
        fullXpath = joinXpath(`//${selfXpath}`, childrenXpath);
        if (isXpathUnique(ownerDocument, fullXpath)) return fullXpath;

        let newChildrenXpath = joinXpath(`${selfXpath}`, childrenXpath);
        return getXpath(element.parentNode, newChildrenXpath);
    }

    let xpath = getXpath(element, null);
    // console.log('getXpath3() return:', xpath);
    if (!isXpathUnique(ownerDocument, xpath)) {
        console.error('getXpath3(): Xpath is not valid and unique:', xpath);
    }
    return xpath;
}

TestRecorder.ElementInfo = function(element) {
    this.text = element.innerText || element.textContent;
    // VIU-3609
    // this.text = this.text.substr(0, 64);
    this.class = element.className;
    if(element.getAttribute("event_action")){
        this.action = element.getAttribute("event_action");
    } else {
        this.action = "";
    }
    this.method = element.method;
    this.href = element.href;
    this.tagName = element.tagName;
    this.rect = element.getBoundingClientRect();
    this.scrollleft = document.documentElement.scrollLeft;
    this.scrolltop = document.documentElement.scrollTop;
    this.xpath = this.getXpath(element);
    this.xpath2 = this.getXpath2(element);
    if (this.xpath2.indexOf('/SELECT[') > 0) {
        // select element
        var x = element.selectedIndex;
        var y = element.options;
        if (x < 0) {
            this.text = ';;' + x;
        } else {
            var real_text = y[x].text;
            var real_value = y[x].value;
            if (!real_text) real_text = '';
            if (!real_value) real_value = '';
            this.text = real_value + ';' + real_text + ';' + x;
        }
    }
    this.xpath3 = this.getXpath3(element);
    this.xpath4 = this.getXpath4(element);
    // VIU-1406 "Invalid Element State" error occurs if check a item by radio button and then click action button
    // Do not append verify if input with type radio / checkbox
    this.sendkey_ok = true;
    let attrType = element.getAttribute('type');
    if (attrType) {
        // We can add more types here if there
        let attrTypes = ['radio','checkbox'];
        if (this.tagName.toLowerCase() == 'input' && attrTypes.indexOf(attrType)>-1) {
            this.sendkey_ok = false;
        }
    }

    this.verify_type  = 'sendverify';
    this.verify_value = getVerify(window.frameElement, this.xpath2);
    this.selector = this.getCleanCSSSelector(element);
    this.type = element.type;
    this.value = element.value;
    // if (this.type == 'password') {
    //     this.value = '*******';
    // }
    this.checked = element.checked;
    this.name = element.name;
    if (this.type)
    this.type = this.type.toLowerCase();
    if (element.form)
        this.form = {id: element.form.id, name: element.form.name};
    this.src = element.src;
    this.id = element.id;
    this.title = element.title;
    this.options = [];
    if (element.selectedIndex) {
        for (var i=0; i < element.options.length; i++) {
            var o = element.options[i];
            this.options[i] = {text:o.text, value:o.value};
        }
    }
    // this.parent = "";
    // this.brother = "";
    // this.child = "";
    this.label = this.findLabelText(element);
    if(element.getAttribute("brother")){
        this.brother = element.getAttribute("brother");
    }
    if(element.getAttribute("parent")){
        this.parent = element.getAttribute("parent");
    }
    if(element.getAttribute("child")){
        this.child = element.getAttribute("child");
    }
    // this.brother = element.getAttribute("brother");
    // this.child = element.getAttribute("child");
    // this.parent = element.getAttribute("parent");
}

TestRecorder.ElementInfo.prototype.findLabelText = function(element) {
    var label = this.findContainingLabel(element)
    var text;
    if (!label) {
        label = this.findReferencingLabel(element);
    }
    if (label) {
        text = label.innerHTML;
        // remove newlines
        text = text.replace('\n', ' ');
        // remove tags
        text = text.replace(/<[^>]*>/g, ' ');
        // remove non-alphanumeric prefixes or suffixes
        text = text.replace(/^\W*/mg, '')
        text = text.replace(/\W*$/mg, '')
        // remove extra whitespace
        text = text.replace(/^\s*/, '').replace(/\s*$/, '').replace(/\s+/g, ' ');
    }

    return text;
}

TestRecorder.ElementInfo.prototype.findReferencingLabel = function(element) {
    var labels = window.document.getElementsByTagName('label')
    for (var i = 0; i < labels.length; i++) {
        if (labels[i].attributes['for'] &&
                labels[i].attributes['for'].value == element.id)
            return labels[i]
    }
}

TestRecorder.ElementInfo.prototype.findContainingLabel = function(element) {
    var parent = element.parentNode;
    if (!parent)
        return undefined;
    if (parent.tagName && parent.tagName.toLowerCase() == 'label')
        return parent;
    else
        return this.findContainingLabel(parent);
}

TestRecorder.ElementInfo.prototype.getXpath = function(el) {
    if (typeof el == "string") return document.evaluate(el, document, null, 0, null)
    if (!el || el.nodeType != 1) return ''
    if (!el.parentNode) return ''
    if (el.id) return "//*[@id='" + el.id + "']"
    var sames = [].filter.call(el.parentNode.children, function (x) { return x.tagName == el.tagName })
    return this.getXpath(el.parentNode) + '/' + el.tagName.toLowerCase() + (sames.length > 1 ? '['+([].indexOf.call(sames, el)+1)+']' : '')
}

TestRecorder.ElementInfo.prototype.getXpath2 = function(element) {
    if (element.tagName == 'HTML')
        return '/HTML[1]';
    if (element===document.body)
        return '/HTML[1]/BODY[1]';
    if (!element.parentNode)
        return ''

    var ix= 0;
    var siblings= element.parentNode.childNodes;
    for (var i= 0; i<siblings.length; i++) {
        var sibling= siblings[i];
        if (sibling===element)
            return this.getXpath2(element.parentNode)+'/'+element.tagName+'['+(ix+1)+']';
        if (sibling.nodeType===1 && sibling.tagName===element.tagName &&
                (sibling.tagName !== 'IFRAME' || !sibling.className.includes('vtaas-frame-dialog')))
            ix++;
    }
}

TestRecorder.ElementInfo.prototype.getXpath3 = function(element) {
    return getElementXpath3(element);
}

TestRecorder.ElementInfo.prototype.getXpath4 = function(element) {
    // append xpath4
    let xpath4 = '';
    let rect = element.getBoundingClientRect();
    let element_width = rect.right.toFixed(2) - rect.left.toFixed(2)
    let element_height = rect.bottom.toFixed(2) - rect.top.toFixed(2)
    // if ( (element_width < 5) || (element_height < 5) ) {
    if (true) {
        let p4Node = element.parentElement;
        while (p4Node) {
            let p4Rect = p4Node.getBoundingClientRect();
            let p4_width = p4Rect.right.toFixed(2) - p4Rect.left.toFixed(2);
            let p4_height = p4Rect.bottom.toFixed(2) - p4Rect.top.toFixed(2);
            if ((p4_width >= 5) && (p4_height >= 5)) {
                let p4List = [p4Rect.top.toFixed(2),
                    p4Rect.bottom.toFixed(2),
                    p4Rect.left.toFixed(2),
                    p4Rect.right.toFixed(2),
                    TestRecorder.ElementInfo.prototype.getXpath2(p4Node),
                    ';;;'
                ];
                xpath4 += p4List.join(';');
            }
            p4Node = p4Node.parentElement;
        }
    }
    return xpath4;
}

TestRecorder.ElementInfo.prototype.selectorNodes = function(selector) {
    result = null;
    try {
        result = document.querySelectorAll(selector);
    } catch (e) {
        return null;
    }
    return result;
}

TestRecorder.ElementInfo.prototype.getCleanCSSSelector = function(element) {
    if(!element) return;
    var selector = element.tagName ? element.tagName.toLowerCase() : '';
    if(selector == '' || selector == 'html') return '';

    var tmp_selector = '';
    var accuracy = 0;
    var selector_nodes = this.selectorNodes(selector);
    if (selector_nodes) {
        accuracy = selector_nodes.length;
    }
    if(element.id) {
        selector = "#" + element.id;
        first_char = element.id.charAt(0);
        if ('0123456789'.indexOf(first_char) !== -1) {
            // https://stackoverflow.com/questions/5672903/can-i-have-a-div-with-id-as-number
            selector = '#\\3' + first_char + ' ' + element.id.substr(1);
        }

        selector_nodes = this.selectorNodes(selector);
        if (selector_nodes) {
            accuracy = selector_nodes.length;
        }
        if(accuracy==1) return selector.trim();
    }
    if(element.className && typeof(element.className) === 'string') {
        // console.log('element.className: ', typeof(element.className), element.className);
        tmp_selector = '.' + element.className.trim().replace(/ /g,".");
        tmp_selector_nodes = this.selectorNodes(tmp_selector);
        if (tmp_selector_nodes) {
            if(tmp_selector_nodes.length < accuracy) {
                selector = tmp_selector;
                accuracy = tmp_selector_nodes.length
                if(accuracy==1) return selector.trim();
            }
        }
    }
    var parent = element.parentNode;
    var parent_selector = this.getCleanCSSSelector(parent);

    if(parent_selector) {

        // resolve sibling ambiguity
        var matching_sibling = 0;
        var matching_nodes = this.selectorNodes(parent_selector + ' > ' + selector);
        if(matching_nodes != 0 && matching_nodes != null){
            for(var i=0; i<matching_nodes.length;i++) {
                if(matching_nodes[i].parentNode == parent) matching_sibling++;
            }
        }
        // for(var i=0; i<matching_nodes.length;i++) {
        //     if(matching_nodes[i].parentNode == parent) matching_sibling++;
        // }
        if(matching_sibling > 1) {
            var index = 1;
            for (var sibling = element.previousElementSibling; sibling; sibling = sibling.previousElementSibling) index++;
            selector = selector + ':nth-child(' + index + ')';
        }

        // remove useless intermediary parent
        selector_array = parent_selector.split(' ');
        if(selector_array.length>1) {
            for(var i=1;i<selector_array.length;i++) {
                tmp_selector = selector_array.slice(0,i).join(' ') + ' ' + selector;
                tmp_selector_nodes = this.selectorNodes(tmp_selector);
                if (tmp_selector_nodes) {
                    if (tmp_selector_nodes.length == 1) {
                        selector = tmp_selector;
                        break;
                    }
                }
            }
        }

        // improve accuracy if still not correct
        selector_nodes = this.selectorNodes(selector);
        if (selector_nodes) {
            accuracy = selector_nodes.length;
            if(accuracy>1) {
                tmp_selector = parent_selector + " " + selector;
                tmp_selector_nodes = this.selectorNodes(tmp_selector);
                if (tmp_selector_nodes) {
                    if (tmp_selector_nodes.length == 1) {
                        selector = tmp_selector;
                    } else {
                        selector = parent_selector + " > " + selector;
                    }
                }
            }
        }
    }

    return selector;
}

TestRecorder.DocumentEvent = function(type, target) {
    this.recordtime = new Date().toISOString();
    this.type = type;
    this.url = target.URL;
    this.title = target.title;
}

TestRecorder.ElementEvent = function(type, target, vuid) {
    var p = new Date();
    if (type == 2) {
        // VIU-957, adjust event sequence
        // VIU-1623, change 20 to 50
        // VIU-957, change 50 to 60
        p.setMilliseconds( p.getMilliseconds() - 60 );
    }
    this.recordtime = p.toISOString();
    this.type = type;
    this.info = new TestRecorder.ElementInfo(target);
    this.vuid = vuid;
}

TestRecorder.InputEvent = function(type, inputtype, data) {
    this.recordtime = new Date().toISOString();
    this.type = type;
    this.inputtype = inputtype;
    this.data = data;
}

TestRecorder.BrowserPromptEvent = function(type, ptype, result) {
    this.recordtime = new Date().toISOString();
    this.type = type;
    this.ptype = ptype;
    this.result = result;
}

// TestRecorder.EventTypes.KeyUp, e.key, e.location, e.ctrlKey, e.shiftKey, e.altKey, e.metaKey
TestRecorder.KeyEvent = function(type, key, code, keycode, location, ctrl, shift, alt, meta) {
    this.recordtime = new Date().toISOString();
    this.type = type;
    this.key = key;
    this.code = code;
    this.keycode = keycode;
    this.location = location;

    this.ctrl = 0;
    if (ctrl) this.ctrl = 1;
    this.shift = 0;
    if (shift) this.shift = 1;
    this.alt = 0;
    if (alt) this.alt = 1;
    this.meta = 0;
    if (meta) this.meta = 1;
}

TestRecorder.MouseEvent = function(type, target, x, y, button, rect, scrolltop, scrollleft, vuid, captureid='') {
    // let target_changed = appendInfoOnTargetElement(target,type);
    if (prodjs) {
        // console.log("prodjs~~~~~~~~~",prodjs);
        if (prodjs.prodConfig.CHANGE_RECORDING_TARGET){
            target = prodjs.prodConfig.changeTarget(target, type);
            // console.log("Target~~~~~~~~~",target);
        }
    }

    this.recordtime = new Date().toISOString();
    //this.recordtime = '2018-09-03T01:01:01.490Z';
    this.type = type;
    this.info = new TestRecorder.ElementInfo(target);
    this.x = x;
    this.y = y;
    this.button = button;
    this.rect = rect;
    this.scrolltop = scrolltop;
    this.scrollleft = scrollleft;
    this.vuid = vuid;
    this.captureid = captureid;
    // console.log("MouseEvent", this.type, this.info, target, this.recordtime)

    this.xpath4 = this.info.xpath4;
}

TestRecorder.ScreenShotEvent = function(eventData) {
    this.recordtime = new Date().toISOString();
    this.event = TestRecorder.EventTypes.ScreenShot;
    this.action = 'screenshot';
    this.obj_text = eventData.name;
    this.obj_xpath = eventData.xpath;
    this.obj_xpath2 = eventData.xpath2;
    this.obj_xpath3 = eventData.xpath3;
    this.obj_selector = eventData.selector;
    this.verify_type = eventData.verify_type;
    this.verify_value = eventData.verify_value;
    this.obj_id = eventData.id;
    this.obj_assert = eventData.extraData; // Use obj_assert to store some custom data
    this.captureid = eventData.captureid;
}

TestRecorder.ReportIssueEvent = function() {
    this.recordtime = new Date().toISOString();
    this.type = TestRecorder.EventTypes.ReportIssue;
}

TestRecorder.OpenURLEvent = function(url) {
    this.recordtime = new Date().toISOString();
    this.type = TestRecorder.EventTypes.OpenUrl;
    this.url = url;
    this.width = window.innerWidth;
    this.height = window.innerHeight;
}

TestRecorder.PageLoadEvent = function(url) {
    this.recordtime = new Date().toISOString();
    this.type = TestRecorder.EventTypes.OpenUrl;
    this.url = url;
    this.viaBack = back
}

TestRecorder.AssertEvent = function(assertData) {
    this.recordtime = new Date().toISOString();
    this.event = TestRecorder.EventTypes.Assert;
    this.obj_left = assertData.obj_left;
    this.obj_top = assertData.obj_top;
    this.obj_right = assertData.obj_right;
    this.obj_bottom = assertData.obj_bottom;
    this.obj_scrolltop = assertData.obj_scrolltop;
    this.obj_scrollleft = assertData.obj_scrollleft;
    this.obj_xpath = assertData.xpath;
    this.obj_xpath2 = assertData.xpath2;
    this.obj_xpath3 = assertData.xpath3;
    this.obj_xpath4 = assertData.xpath4;
    this.obj_selector = assertData.selector;
    this.verify_type = assertData.verify_type;
    this.verify_value = assertData.verify_value;
    this.obj_text = assertData.text;
    this.obj_value = assertData.value;
    this.obj_id = assertData.id;
    this.obj_class = assertData.class;
    this.obj_assert = assertData.jsonData;
    this.captureid = assertData.captureid;
    //this.obj_value =
    this.action= 'assert';
    this.client = ''; // Filled in backgroud scripty
}

TestRecorder.BaseEvent = class {
    constructor() {
        this.recordtime = new Date().toISOString();
    }

    record() {
        recorder.testcase.append(this);
    }
};

TestRecorder.ExecuteEvent = class ExecuteEvent extends TestRecorder.BaseEvent {
    constructor(commandName) {
        super();
        this.event = TestRecorder.EventTypes.Execute;
        this.action = 'execute';
        this.obj_parent = commandName;
        this.obj_brother = 'localhost';
        this.verify_value = 'ls -l';
        this.obj_child = 'total';
    }

    /*
     * commandInfo: {
                        command: 1,
                        host: 1
                    }
     */
    static create(commandInfo) {
        return new ExecuteEvent(commandInfo);
    }
}

TestRecorder.AccessibilityEvent = class AccessibilityEvent extends TestRecorder.BaseEvent {
    constructor() {
        super();
        this.event = TestRecorder.EventTypes.Accessibility;
        this.action = 'accessibility';
    }

    static create() {
        return new AccessibilityEvent();
    }
}

vtaas.eventRecord = {
    saveAssertEvent: function(assertData) {
        let captureid = uuidv4();
        chrome.runtime.sendMessage({action: 'capture', message: captureid});
        sleep(200);
        assertData.captureid = captureid;
        recorder.testcase.append(new TestRecorder.AssertEvent(assertData));
    },

    saveScreenshotEvent: function(eventData) {
        let captureid = uuidv4();
        let rect = null;
        let windowInnerRect = {innerWidth: window.innerWidth, innerHeight: window.innerHeight};

        extraDataJson = JSON.parse(eventData.extraData);
        if (extraDataJson.areaType == 'element') {
            rect = getElementRectRelativeToBrowser(eventData.verify_value);
        } else if (extraDataJson.areaType == 'fullpage') {
            window.scrollTo(document.body.scrollWidth, document.body.scrollHeight)
        }

        if (vtaas.state.testType !== 'parallel') {
            chrome.runtime.sendMessage({
                action: 'capture',
                message: captureid,
                areaType: extraDataJson.areaType,
                rect: rect,
                windowInnerRect: windowInnerRect
            });
            sleep(200);
        }

        eventData.captureid = captureid;
        recorder.testcase.append(new TestRecorder.ScreenShotEvent(eventData));
    }
};

//---------------------------------------------------------------------------
// Recorder -- a controller class that manages the recording of web browser
//      activities to produce a test case.
// Instance Methods:
// start() -- start recording browser events.
// stop() -- stop recording browser events.
// reset() -- reset the recorder and initialize a new test case.
//---------------------------------------------------------------------------

TestRecorder.Recorder = function() {
    this.testcase = new TestRecorder.TestCase();
    this.logfunc = null;
    this.captureHandlers = new Map();
    //this.active = false;
}

// The recorder is a singleton -- there is no real reason to have more than
// one instance, and many of its methods are event handlers which need a
// stable reference to the instance.

recorder = new TestRecorder.Recorder();
recorder.logfunc = function(msg) {console.log(msg);};

TestRecorder.Recorder.prototype.start = function() {
    this.addAllCaptureHandler();

    // OVERRIDE stopPropagation
    var actualCode = '(' + function() {
        var overloadStopPropagation = Event.prototype.stopPropagation;
        Event.prototype.stopPropagation = function(){
            //console.log(this);
            overloadStopPropagation.apply(this, arguments);
        };
    } + ')();';
    var script = document.createElement('script');
    script.textContent = actualCode;
    (document.head||document.documentElement).appendChild(script);
    script.parentNode.removeChild(script);

    // disable mousewheel
    document.addEventListener('mousewheel', function(e){
        e.stopPropagation();
        e.preventDefault();
        e.cancelBubble = false;
        return false;
    }, false);

    //this.active = true;
    this.log("recorder started");
}

TestRecorder.Recorder.prototype.stop = function() {
    this.removeAllCaptureHandler();
    //this.active = false;
    this.log("recorder stopped");
    return;
}

TestRecorder.Recorder.prototype.open = function(url) {
    var e = new TestRecorder.OpenURLEvent(url);
    this.testcase.append(e);
    this.log("open url: " + url);
}

TestRecorder.Recorder.prototype.pageLoad = function() {
    // var doc = recorder.window.document;
    // var et = TestRecorder.EventTypes;
    // var e = new TestRecorder.DocumentEvent(et.PageLoad, doc);
    // this.testcase.append(e);
    console.log("++++ page loaded +++++");
    var curr_time = new Date().toISOString().slice(0, 19);
    chrome.runtime.sendMessage({action: "worker-status", 'event_id': 0, 'status': 'page-load', 'message': curr_time});
}

TestRecorder.Recorder.prototype.createEventPreprocessor = function(handler) {
    return function(event) {
        if (!vtaas.utils.needRecording(event.target)) {
            return;
        }

        handler(event);
    }
}

TestRecorder.Recorder.prototype.addCaptureHandler = function(type, handler) {
    let preprocessorHandler = this.createEventPreprocessor(handler);
    if (!this.captureHandlers.has(type)) {
        this.captureHandlers.set(type, []);
    }
    this.captureHandlers.get(type).push(preprocessorHandler);
    window.addEventListener(type, preprocessorHandler, true);
}

TestRecorder.Recorder.prototype.addAllCaptureHandler = function() {
    // this.addCaptureHandler("contextmenu", this.oncontextmenu);
    this.addCaptureHandler("load", this.pageLoad);
    this.addCaptureHandler("mousedown", this.onmousedown);
    this.addCaptureHandler("mouseup", this.onmouseup);
    this.addCaptureHandler("click", this.onclick);
    this.addCaptureHandler("change", this.onchange);
    this.addCaptureHandler("keypress", this.onkeypress);
    this.addCaptureHandler("keydown", this.onkeydown);
    this.addCaptureHandler("keyup", this.onkeyup);
    this.addCaptureHandler("input", this.oninput);
    this.addCaptureHandler("mouseover", this.onmouseover);
    this.addCaptureHandler("browserprompt", this.onbrowserprompt);
    //this.addCaptureHandler("focus", this.onfocus);
}

TestRecorder.Recorder.prototype.removeAllCaptureHandler = function() {
    this.captureHandlers.forEach((value, key, map) => {
        for (let handler of value) {
            window.removeEventListener(key, handler, true);
        }
    });
}

TestRecorder.Recorder.prototype.clickaction = function(e) {
    // This method is called by our low-level event handler when the mouse
    // is clicked in normal mode. Its job is decide whether the click is
    // something we care about. If so, we record the event in the test case.

    var et = TestRecorder.EventTypes;
    var t = e.target();
    if (t.href || (t.type && t.type == "submit") ||
            (t.type && t.type == "submit")) {
        this.testcase.append(new TestRecorder.ElementEvent(et.Click,e.target()));
    } else {
        recorder.testcase.append(
                new TestRecorder.MouseEvent(
                        TestRecorder.EventTypes.Click, e.target(), e.posX(), e.posY(), 0
                ));
    }
}

// TestRecorder.Recorder.prototype.onpageload = function() {
//     if (this.active) {
//         // This must be called each time a new document is fully loaded into the
//         // testing target frame to ensure that events are captured for the page.
//         recorder.captureEvents();

//         // if a new page has loaded, but there doesn't seem to be a reason why,
//         // then we need to record the fact or the information will be lost
//         if (this.testcase.peek()) {
//             var last_event_type = this.testcase.peek().type;
//             if (last_event_type != TestRecorder.EventTypes.OpenUrl &&
//                     last_event_type != TestRecorder.EventTypes.Click &&
//                     last_event_type != TestRecorder.EventTypes.Submit) {
//                 this.open(this.window.location.toString());
//             }
//         }

//         // record the fact that a page load happened
//         if (this.window)
//             this.pageLoad();
//     }
// }

TestRecorder.Recorder.prototype.onmouseover = function(e) {
    if (!vtaas.state.mouseOverOn) {
        return;
    }
    rect = e.target.getBoundingClientRect();
    vuid = e.target.getAttribute("vuid");
    scrollleft = document.documentElement.scrollLeft;
    scrolltop = document.documentElement.scrollTop;
    var e = new TestRecorder.Event(e);
    recorder.testcase.append(
        new TestRecorder.MouseEvent(
                TestRecorder.EventTypes.MouseOver,
                e.target(), e.posX(), e.posY(), e.button(),
                rect, scrolltop, scrollleft, vuid
        ));
}


TestRecorder.Recorder.prototype.onchange = function(e) {
    vuid = e.target.getAttribute("vuid");
    var e = new TestRecorder.Event(e);
    var et = TestRecorder.EventTypes;
    var v = new TestRecorder.ElementEvent(et.Change, e.target(), vuid);
    recorder.testcase.append(v);
    recorder.log("value changed: " + e.target().value);
}

TestRecorder.Recorder.prototype.onbrowserprompt = function(e) {
    e.ptype = document.getElementById("vtaas_alert_properties").getAttribute("ptype");
    e.result = document.getElementById("vtaas_alert_properties").getAttribute("result");
    console.log('browserprompt:',
                e.ptype,
                e.result);
    recorder.testcase.append(
        new TestRecorder.BrowserPromptEvent(
                TestRecorder.EventTypes.BrowserPrompt, e.ptype, e.result
        ));
}

let warnedPasswordElements = [];
function showPasswordWarningDialog(element) {
    if (!vtaas.utils.isLeader()) {
        return;
    }
    if (element.tagName && element.tagName === 'INPUT' && element.getAttribute('type') === 'password') {
        if (warnedPasswordElements.indexOf(element) === -1) {
            warnedPasswordElements.push(element);
            const warnMsg = '\n\n                                 vTaaS Warnings\n\n'
                    + 'Do NOT input any PERSONAL CREDENTIAL during recording, it can be visible to other users.';
            window.alert(warnMsg);
        }
        // console.log('A11Y Init: ', vtaas.state.accessibilityEnabled, vtaas.state.accessibilityUser, vtaas.state.accessibilityPassword);
        if (vtaas.state.accessibilityEnabled && vtaas.state.accessibilityUser && vtaas.state.accessibilityPassword) {
            // console.log('A11Y AutoFill: ', vtaas.state.accessibilityUser, vtaas.state.accessibilityPassword);
            let username = document.querySelector('#username');
            let titleIndex = document.title.indexOf('VMware Identity Manager');
            if ((username) && (titleIndex >= 0)) {
                if (username.value.indexOf(vtaas.state.accessibilityUser) >= 0) {
                    // console.log('A11Y Match: ', vtaas.state.accessibilityUser, vtaas.state.accessibilityPassword);
                    let input_value = vtaas.state.accessibilityPassword;
                    let input_arr = input_value.split('%%');
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
                            input_value = orig_str;
                        }
                    }
                    element.value = input_value;
                    var event = document.createEvent('Event');
                    event.initEvent('change', false, true)
                    element.dispatchEvent(event);
                }
            }
        }
    }
}

TestRecorder.Recorder.prototype.onmousedown = function(e) {
    console.log('mousedown here: ', e);
    let captureid = uuidv4();
    chrome.runtime.sendMessage({action: 'capture', message: captureid});
    sleep(200);
    rect = e.target.getBoundingClientRect();
    vuid = e.target.getAttribute("vuid");
    scrollleft = document.documentElement.scrollLeft;
    scrolltop = document.documentElement.scrollTop;
    var e = new TestRecorder.Event(e);
    recorder.testcase.append(
        new TestRecorder.MouseEvent(
                TestRecorder.EventTypes.MouseDown,
                e.target(), e.posX(), e.posY(), e.button(),
                rect, scrolltop, scrollleft, vuid,
                captureid
        ));
}

TestRecorder.Recorder.prototype.onmouseup = function(e) {
    let target = e.target;
    rect = e.target.getBoundingClientRect();
    vuid = e.target.getAttribute("vuid");
    scrollleft = document.documentElement.scrollLeft;
    scrolltop = document.documentElement.scrollTop;
    var e = new TestRecorder.Event(e);
    recorder.testcase.append(
        new TestRecorder.MouseEvent(
                TestRecorder.EventTypes.MouseUp,
                e.target(), e.posX(), e.posY(), e.button(),
                rect, scrolltop, scrollleft, vuid
        ));
    showPasswordWarningDialog(target);
}

TestRecorder.Recorder.prototype.onclick = function(e) {
    // VIU-1730
    console.log('click here');
    let captureid = '';
    let target = e.target;
    rect = e.target.getBoundingClientRect();
    vuid = e.target.getAttribute("vuid");
    scrollleft = document.documentElement.scrollLeft;
    scrolltop = document.documentElement.scrollTop;
    var e = new TestRecorder.Event(e);
    recorder.testcase.append(
        new TestRecorder.MouseEvent(
                TestRecorder.EventTypes.Click,
                e.target(), e.posX(), e.posY(), e.button(),
                rect, scrolltop, scrollleft, vuid,
                captureid
        ));
    showPasswordWarningDialog(target);

    // if (e.shiftkey()) {
    //     recorder.check(e);
    //     e.stopPropagation();
    //     e.preventDefault();
    //     return false;
    // }

    // if (e.button() == TestRecorder.Event.RightButton) {
    //     recorder.check(e);
    //     return true;
    // } else if (e.button() == TestRecorder.Event.LeftButton) {
    //     recorder.clickaction(e);
    //     return true;
    // }

    // if (e.button() == TestRecorder.Event.LeftButton) {
    //     recorder.clickaction(e);
    //     return true;
    // }
    // e.stopPropagation();
    // e.preventDefault();
    // return false;
}

TestRecorder.Recorder.prototype.oncontextmenu = function(e) {
    var e = new TestRecorder.Event(e);
    // //recorder.check(e);
    e.stopPropagation();
    e.preventDefault();
    return false;
}

TestRecorder.Recorder.prototype.oninput = function(e) {
    console.log('input:', e.inputType, e.data);
    recorder.testcase.append(
        new TestRecorder.InputEvent(
                TestRecorder.EventTypes.Input, e.inputType, e.data
        ));
}

TestRecorder.Recorder.prototype.onkeydown = function(e) {
    //console.log('keydown:', e.type, e.key, e.code, e.location, e.ctrlKey, e.shiftKey, e.altKey, e.metaKey);
    if (e.ctrlKey && e.code == 'KeyB'){
        chrome.runtime.sendMessage({action:'report_issue', message:''});
        e.stopPropagation();
        e.preventDefault();
        return false;
    } else if (e.ctrlKey && e.shiftKey && e.code == 'KeyA') {
        if (vtaas.state.accessibilityEnabled) {
            console.log('CHECK_ACCESSIBILITY ======');
            // This key press may be triggered within iFrame
            let msgData = {
                type: 'CHECK_ACCESSIBILITY'
            };
            window.top.postMessage(msgData, '*');
        }
        //accessibilityCheck();
        e.stopPropagation();
        e.preventDefault();
        return false;
    }
    var t = new TestRecorder.Event(e);
    let target_type = '';
    if (e.target) {
        if (e.target.type) {
            target_type = e.target.type.toLowerCase();
        }
    }
    let PWCHARS = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ`~!@#$%^&*()_-+=<>?:{}|,./;'[]\"\\";
    if ((target_type != 'password') || (PWCHARS.indexOf(e.key) < 0)){
        recorder.testcase.append(
            new TestRecorder.KeyEvent(
                    TestRecorder.EventTypes.KeyDown, e.key, e.code, t.keycode(), e.location, e.ctrlKey, e.shiftKey, e.altKey, e.metaKey
            ));
    }
}

TestRecorder.Recorder.prototype.onkeyup = function(e) {
    // console.log('keyup:', e.type, e.key, e.code, e.location, e.ctrlKey, e.shiftKey, e.altKey, e.metaKey);
    var t = new TestRecorder.Event(e);
    let target_type = '';
    if (e.target) {
        if (e.target.type) {
            target_type = e.target.type.toLowerCase();
        }
    }
    let PWCHARS = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ`~!@#$%^&*()_-+=<>?:{}|,./;'[]\"\\";
    if ((target_type != 'password') || (PWCHARS.indexOf(e.key) < 0)){
        recorder.testcase.append(
            new TestRecorder.KeyEvent(
                    TestRecorder.EventTypes.KeyUp, e.key, e.code, t.keycode(), e.location, e.ctrlKey, e.shiftKey, e.altKey, e.metaKey
            ));
    }
    showPasswordWarningDialog(e.target);
}

TestRecorder.Recorder.prototype.onkeypress = function(e) {
    var e = new TestRecorder.Event(e);
    // if (e.shiftkey() && (e.keychar() == 'C')) {
    //     // TODO show comment box here
    // }
    // if (e.shiftkey() && (e.keychar() == 'S')) {
    //     recorder.testcase.append(new TestRecorder.ScreenShotEvent());
    //     e.stopPropagation();
    //     e.preventDefault();
    //     return false;
    // }

    // console.log('keypress: ', e.ctrlKey(), e.keycode());
    // ctrl + q
    if (e.ctrlKey() && e.keycode() == 17) {
        vtaas.utils.pauseBeforeOperation();
        //vtaas.utils.createScreenshotDialog();
        vtaas.contentUtils.FrameDialog.createScreenshotDialog();
        e.stopPropagation();
        e.preventDefault();
        return false;
    }

    var last = recorder.testcase.peek();
    // recorder.testcase.append(
    //     new TestRecorder.KeyEvent(e.target(), e.keychar())
    // );
    // recorder.testcase.poke(e.target());

    console.log('last: ', last);

    if(last.type == TestRecorder.EventTypes.KeyPress) {
        last.text = last.text + e.keychar();
        recorder.testcase.poke(last);
    } else {
        recorder.testcase.append(
            new TestRecorder.KeyEvent(e.target(), e.keychar())
        );
    }
    return true;
}

TestRecorder.Recorder.prototype.log = function(text) {
    if (this.logfunc) {
        this.logfunc(text);
    }
}

// Register the recorder event capture handler immediately
recorder.start();

function getAllFramesInDoc() {
    var i_frames = document.getElementsByTagName('iframe');
    var arrIframes = new Array();
    for(var i=0; i<i_frames.length; i++){
        var first_doc = i_frames[i].document || i_frames[i].contentDocument;
        if (first_doc) {
            arrIframes.push(i_frames[i]);
            var j_frames = first_doc.getElementsByTagName('iframe');
            for(var j=0; j<j_frames.length; j++) {
                var second_doc = j_frames[j].document || j_frames[j].contentDocument;
                if (second_doc) {
                    arrIframes.push(j_frames[j]);
                }
            }
        }
    }
    return arrIframes;
}

function findPos(frm) {
    var pleft = ptop = 0;
    var pframe = frm;
    while (pframe && (pframe != window)) {
        if (pframe.frameElement) {
            prect = pframe.frameElement.getBoundingClientRect();
            pleft += prect.left;
            ptop += prect.top;
            // console.log('frame rect: ', prect.left, prect.top);
        }
        pframe = pframe.parent;
    }
    return {left: pleft, top: ptop};
}

function findPos2(frm) {
    var pleft = ptop = 0;
    if ( (!frm) || (frm == window) ) {
        return {left: pleft, top: ptop};
    }
    var i_frames = document.getElementsByTagName('iframe');
    for(var i=0; i<i_frames.length; i++){
        var i_rect = i_frames[i].getBoundingClientRect();
        if ( (i_rect.left >= 0) && (i_rect.top >= 0) ) {
            pleft = i_rect.left;
            ptop = i_rect.top;
        }
        if (i_frames[i] == frm) {
            // 1-layer frame
            return {left: pleft, top: ptop};
        }
        var first_doc = i_frames[i].document || i_frames[i].contentDocument;
        if (first_doc) {
            var j_frames = first_doc.getElementsByTagName('iframe');
            for(var j=0; j<j_frames.length; j++) {
                var j_rect = j_frames[j].getBoundingClientRect();
                if ( (j_frames[j] == frm) && (j_rect.left >= 0) && (j_rect.top >= 0) ){
                    // 2-layer frame
                    pleft += j_rect.left;
                    ptop += j_rect.top;
                    return {left: pleft, top: ptop};
                }
            }
        }
    }
    return {left: pleft, top: ptop};
}


var found_frame = null;
function matchAllFrames(frm, i_frames, parent_frame) {
    for(var i=0; i<i_frames.length; i++){
        if (found_frame) {
            break;
        }
        i_frames[i].vtaas_parent_frame = parent_frame;
        // console.log('===', i, parent_frame, i_frames[i].vtaas_parent_frame);
        if (frm == i_frames[i]) {
            found_frame = i_frames[i];
        }
        var first_doc = i_frames[i].document || i_frames[i].contentDocument;
        if (first_doc) {
            matchAllFrames(frm, first_doc.getElementsByTagName('iframe'), i_frames[i]);
        }
    }
}

function findFrameValue(frm) {
    if ( (!frm) || (frm == window) ) {
        return '';
    }
    var i_frames = window.top.document.getElementsByTagName('iframe');
    found_frame = null;
    frame_verify = [];
    matchAllFrames(frm, i_frames, null);
    // console.log('++++++', found_frame, found_frame.vtaas_parent_frame);
    while(found_frame.vtaas_parent_frame) {
        let prt_frame = found_frame.vtaas_parent_frame;
        let frame_id = prt_frame.id ? prt_frame.id : null;
        let frame_name = prt_frame.name ? prt_frame.name : null;
        let frame_xpath = TestRecorder.ElementInfo.prototype.getXpath2(prt_frame);
        frame_verify.push(frame_id + '|' + frame_name + '|' + frame_xpath)
        // console.log('++++', found_frame);
        found_frame = found_frame.vtaas_parent_frame;
    }
    frame_verify.reverse();
    console.log('frame_verify, ', frame_verify.join(','));
    return frame_verify.join(',');
}

function findElementByVerifyValue(verifyValue) {
    let verifyValueComponents = verifyValue.split(';');
    let elementXpath2 = verifyValueComponents[2];
    let frameLocators = verifyValueComponents[0].split(',');

    let foundElementFrame = null;
    let contextDocument = window.top.document;
    for (const fl of frameLocators) {
        let frameXpath2 = fl.split('|')[2];
        if (frameXpath2 === 'null') break;
        let frameElement = getElementByXpath(contextDocument, frameXpath2);
        foundElementFrame = frameElement;
        contextDocument = frameElement.document || frameElement.contentDocument;
    }
    let foundElement = getElementByXpath(contextDocument, elementXpath2);
    return [foundElement, foundElementFrame];
}

function getElementRectRelativeToBrowser(verifyValue) {
    let [foundElement, foundElementFrame] = findElementByVerifyValue(verifyValue);
    let resultRect = null;
    if (foundElement) {
        let framePosition = findPos2(foundElementFrame);
        let elementRect = foundElement.getBoundingClientRect();
        resultRect = {
            left: framePosition.left + elementRect.left,
            top: framePosition.top + elementRect.top,
            width: elementRect.width,
            height: elementRect.height
        }
    }
    return resultRect;
}

function getElementByXpath(doc, path) {
  return doc.evaluate(path, doc, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
}

function simulate_keypress(element, text) {
    var event = document.createEvent('Event');
    event.initEvent('keypress', true, true)
    event.keyCode = 76;
    element.dispatchEvent(event);
    // var evt = document.createEvent("KeyboardEvent");
    // evt.initKeyEvent(
    //     type, true, true, window,
    //     0, 0, 0, 0,
    //     0, text.charCodeAt(0));
    // document.dispatchEvent(evt);
}

function verifyElement(request) {
    var arrIframes = getAllFramesInDoc();
    var lower_product = request.product.toLowerCase();

    // console.log('frames-length:', this.frames.length, window.frames.length, $(frames).length, $(window).length, $(top).length, arrIframes.length);
    var top_frame = $(window)[0];
    var frame_id = 'null';
    var frame_name = 'null';
    var frame_xpath = 'null'
    var elt = getElementByXpath(top_frame.document, request.xpath2);
    // var top_frame = $(window)[0];
    var temp_verify = frame_id + '|' + frame_name + '|' + frame_xpath + ';xpath2;' + request.xpath2;
    if ((!elt)) {
        elt = top_frame.document.getElementById(request.obj_id)
        temp_verify = frame_id + '|' + frame_name + '|' + frame_xpath + ';obj_id;' + request.obj_id;
        if (!elt) {
            elt = top_frame.document.querySelector(request.selector);
            temp_verify = frame_id + '|' + frame_name + '|' + frame_xpath + ';selector;' + request.selector;
            if (!elt) {
                elt = getElementByXpath(top_frame.document, request.xpath);
                temp_verify = frame_id + '|' + frame_name + '|' + frame_xpath + ';xpath;' + request.xpath;
            }
        }
    }

    // var lower_product = request.product.toLowerCase();
    if (!elt) {
        var window_frames = null;
        // window_frames = $(window)[0].frames;
        window_frames = arrIframes;

        // var window_frames = $(window)[0].frames;
        // var window_frames = arrIframes;
        for (var i = 0; i < window_frames.length; i++) {
            var current_frame = window_frames[i];
            frame_id = current_frame.id;
            frame_name = current_frame.name;
            frame_xpath = TestRecorder.ElementInfo.prototype.getXpath2(current_frame);
            var current_doc = current_frame.document || current_frame.contentDocument;
            // var elt = current_doc.getElementById(request.obj_id);
            var elt = getElementByXpath(current_doc, request.xpath2);
            temp_verify = frame_id + '|' + frame_name + '|' + frame_xpath + ';xpath2;' + request.xpath2;
            if ((!elt)) {
                elt = current_doc.getElementById(request.obj_id);
                temp_verify = frame_id + '|' + frame_name + '|' + frame_xpath + ';obj_id;' + request.obj_id;
                if (!elt) {
                    elt = current_doc.querySelector(request.selector);
                    temp_verify = frame_id + '|' + frame_name + '|' + frame_xpath + ';selector;' + request.selector;
                    if (!elt) {
                        elt = getElementByXpath(current_doc, request.xpath);
                        temp_verify = frame_id + '|' + frame_name + '|' + frame_xpath + ';xpath;' + request.xpath;
                    }
                }
            }
            if (elt) {
                // add parent frame
                frame_value = findFrameValue(current_frame);
                temp_verify = frame_value + ',' + temp_verify;
                break;
            }
        }
    }
    return [elt, temp_verify, arrIframes, current_frame];
}

function getVerify(current_frame, requestType){
    var temp_verify = null;
    var frame_id = null;
    var frame_name = null;
    var frame_xpath = null;
    if(current_frame){
        frame_id = current_frame.id ? current_frame.id : frame_id;
        frame_name = current_frame.name ? current_frame.name : frame_name;
        frame_xpath = TestRecorder.ElementInfo.prototype.getXpath2(current_frame);
    }
    // console.log('getVerify:', current_frame, frame_id + '|' + frame_name + '|' + frame_xpath + ';xpath2;' + requestType);
    temp_verify = frame_id + '|' + frame_name + '|' + frame_xpath + ';xpath2;' + requestType;
    frame_value = findFrameValue(current_frame);
    if (frame_value && frame_value !== '') {
        temp_verify = frame_value + ',' + temp_verify;
    }
    return temp_verify;
}

function findElementByXPath2(top_frame,window_frames,xpath2){
    var elt = null;
    var temp_verify = null;
    elt = getElementByXpath(top_frame.document, xpath2);
    if(elt){
        temp_verify = getVerify(null,xpath2);
        console.log("Found element in main frame by xpath2",elt,temp_verify);
    } else{
        var current_frame = null;
        var current_doc = null;
        for (var i = 0; i < window_frames.length; i++) {
            current_frame = window_frames[i];
            current_doc = current_frame.document || current_frame.contentDocument;
            elt = getElementByXpath(current_doc, xpath2);
            if(elt){
                temp_verify = getVerify(current_frame, xpath2);
                console.log("Found element in frame by xpath2: ", elt, temp_verify);
                break;
            }
        }
    }
    return [elt,temp_verify,current_frame];
}

function findElementByID(top_frame,window_frames, obj_id){
    var elt = null;
    var temp_verify = null;
    elt = top_frame.document.getElementById(obj_id)
    if(elt){
        temp_verify = getVerify(null, obj_id);
        console.log("Found element in main frame by id",elt,temp_verify);
    } else{
        var current_frame = null;
        var current_doc = null;
        for (var i = 0; i < window_frames.length; i++) {
            current_frame = window_frames[i];
            current_doc = current_frame.document || current_frame.contentDocument;
            elt = current_doc.getElementById(obj_id);
            if(elt){
                temp_verify = getVerify(current_frame, obj_id);
                console.log("Found element in frame by ID: ", elt, temp_verify);
                break;
            }
        }
    }
    return [elt,temp_verify,current_frame];
}

function findElementBySelector(top_frame,window_frames,selector){
    var elt = null;
    var temp_verify = null;
    elt = top_frame.document.querySelector(selector);
    if(elt){
        temp_verify = getVerify(null, selector);
        console.log("Found element in main frame by selector",elt,temp_verify);
    } else{
        var current_frame = null;
        var current_doc = null;
        for (var i = 0; i < window_frames.length; i++) {
            current_frame = window_frames[i];
            current_doc = current_frame.document || current_frame.contentDocument;
            elt = current_doc.querySelector(selector);
            if(elt){
                temp_verify = getVerify(current_frame, selector);
                console.log("Found element in frame by Selector: ", elt, temp_verify);
                break;
            }
        }
    }
    return [elt,temp_verify,current_frame];
}

function findElementByXPath(top_frame,window_frames,xpath){
    var elt = null;
    var temp_verify = null;
    elt = getElementByXpath(top_frame.document, xpath);
    if(elt){
        temp_verify = getVerify(null, xpath);
        console.log("Found element in main frame by xpath",elt,temp_verify);
    } else{
        var current_frame = null;
        var current_doc = null;
        for (var i = 0; i < window_frames.length; i++) {
            current_frame = window_frames[i];
            current_doc = current_frame.document || current_frame.contentDocument;
            elt = getElementByXpath(current_doc, xpath);
            if(elt){
                temp_verify = getVerify(current_frame, xpath);
                console.log("Found element in frame by XPath: ", elt, temp_verify);
                break;
            }
        }
    }
    return [elt,temp_verify,current_frame];
}

function findElement(top_frame,window_frames,request){
    let [elt, temp_verify,current_frame] = findElementByXPath2(top_frame,window_frames,request.xpath2);
    console.log("xpath2 ~~~~~~~~~~~~~~", elt, temp_verify);
    if(!elt){
        [elt, temp_verify,current_frame] = findElementByID(top_frame,window_frames,request.obj_id);
        console.log("id ~~~~~~~~~~~~~~", elt, temp_verify);
        if(!elt){
            [elt, temp_verify,current_frame] = findElementBySelector(top_frame,window_frames,request.selector);
            console.log("selector ~~~~~~~~~~~~~~", elt, temp_verify);
            if(!elt){
                [elt, temp_verify,current_frame] = findElementByXPath(top_frame,window_frames,request.xpath);
                console.log("xpath ~~~~~~~~~~~~~~", elt, temp_verify);
            }
        }
    }
    return [elt, temp_verify,current_frame];
}


if (!window.frameElement) {
    // top window
    chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
        console.log("Got request: ", request);
        // if (request.action == "start") {
        //     console.log("recorder.start", request);
        //     recorder.start();
        //     sendResponse({});
        // } else
        if (request.action == "open") {
            recorder.open(request.url);
            sendResponse({});
        } else if (request.action == "addComment") {
            recorder.addComment(request.text);
            sendResponse({});
        } else if ((request.action == "19") || (request.action == "20") || (request.action == "24")) {
            // console.log("search main document: ", request);
            var arrIframes = getAllFramesInDoc();

            // console.log('frames-length:', this.frames.length, window.frames.length, $(frames).length, $(window).length, $(top).length, arrIframes.length);
            var top_frame = $(window)[0];
            var frame_id = 'null';
            var frame_name = 'null';
            var frame_xpath = 'null';
            var lower_product = request.product.toLowerCase();
            // var lower_product = vtaas.state.product.toLowerCase();
            console.log("worker lower_product",lower_product);

            var elt;

            // VIU-1230 The worker follow leader uncorrectly in the left navigation under Environment-> AllObjects
            // root cause : the left nagigation items display in diffrent orders when leader and worker are different languages.
            let brotherNodeClass = request.brother;
            let parentClass = request.parent;
            let childClass = request.child;
            if(brotherNodeClass){
                if (prodjs) {
                    // product specific
                    if (prodjs.prodConfig.ENABLE_RECORDING_VROPS){
                        if (brotherNodeClass.indexOf("vropsNavi") >= 0) {
                            elt = prodjs.prodConfig.findElement_VROPS_AllObjectsLeftNavi(top_frame,request,brotherNodeClass,parentClass,childClass);
                        } else if (brotherNodeClass.indexOf("vropsSortA") >= 0){
                            elt = prodjs.prodConfig.findElement_VROPS_SortA_NotTranslate(top_frame,request,brotherNodeClass,parentClass,childClass);
                        } else if (brotherNodeClass.indexOf("vropsEnvNavi") >= 0){
                            elt =  prodjs.prodConfig.findElement_VROPS_EnvNavi(top_frame,request,brotherNodeClass,parentClass,childClass);
                        }
                    }
                }
            } else {
                var window_frames = null;
                var current_frame = null;
                // window_frames = $(window)[0].frames;
                window_frames = arrIframes;
                let [elt1,temp_verify1,current_frame1] = findElement(top_frame,window_frames,request);
                elt = elt1;
                temp_verify = temp_verify1;
                current_frame = current_frame1;
                console.log("elt and temp_verify:", elt, temp_verify, current_frame);
            }

            if (!elt) {
                console.log('Get element failed: ', request);
            } else {
                var lower_product = request.product.toLowerCase();
                var isToggleSwitchFound = false;
                let worker_mouse_pass = false;

                if (prodjs) {
                    // product specific
                    if (prodjs.prodConfig.ENABLE_RECORDING_SELECTION){
                        prodjs.prodConfig.removeFocusOnSelect(elt,request);
                    }
                }

                // select element
                var vti = request.text.split(';');
                var select_value, select_text = '';
                var select_index = -1;
                if (vti.length == 3) {
                    select_value = vti[0];
                    select_text = vti[1];
                    if (vti[2].length > 0) {
                        select_index = parseInt(vti[2]);
                    }
                }

                if (((request.action == "select") || (request.action == "20")) && (select_index >= 0)) {
                    var select_match = false;
                    var len = elt.options.length;
                    // check value
                    for(i = 0; i < len; i++)
                    {
                        if (elt.options[i].value == select_value)
                        {
                            elt.selectedIndex = i;
                            select_match = true;
                            break;
                        }
                    }
                    // check text
                    if (!select_match) {
                        for(i = 0; i < len; i++)
                        {
                            if (elt.options[i].text == select_text)
                            {
                                elt.selectedIndex = i;
                                select_match = true;
                                break;
                            }
                        }
                    }
                    // check index
                    if (!select_match) {
                        elt.selectedIndex = select_index;
                    }
                }
                rect = elt.getBoundingClientRect();
                var framePos = findPos2(current_frame);
                //******************start************************ */
                // VIU-160
                //Check the element whther is a line
                var index_x = index_y =0;
                if ((rect.right -rect.left) <= 1){
                    index_x = 1;
                }else{
                    index_x = (request.x - request.left) / (request.right - request.left);
                }
                if((rect.bottom - rect.top) <= 1){
                    index_y = 1;
                }else{
                    index_y = (request.y - request.top) / (request.bottom - request.top);
                }

                var inner_x = (rect.right - rect.left) * index_x;
                var inner_y = (rect.bottom - rect.top) * index_y;
                console.log('index_x: ', index_x, 'index_y: ', index_y, 'inner_x: ', inner_x, 'inner_y: ', inner_y);
                //******************end********************** */

                console.log('rect.left: ', rect.left, 'rect.right: ', rect.right,
                            'current.bottom: ', rect.bottom, 'current.top: ', rect.top);
                var current_x = framePos.left + rect.left + inner_x - request.scrollleft;
                var current_y = framePos.top + rect.top + inner_y - request.scrolltop;

                console.log('request.x: ', request.x, 'request.y: ', request.y,
                            'current.x: ', current_x, 'current.y: ', current_y);

                console.log('request.scrolltop: ', request.scrolltop, 'request.scrollleft: ', request.scrollleft);

                if (isToggleSwitchFound || worker_mouse_pass) {
                    chrome.runtime.sendMessage({id: request.id,
                        sn: request.sn,
                        action: "worker-mouse-pass",
                        'type': request.action,
                        'button': request.button,
                        'x': current_x,
                        'y': current_y}, function(response) {
                        console.log('worker-mouse-pass done: ', response.result, request.action, request.button, current_x, current_y);
                    });
                } else {
                    chrome.runtime.sendMessage({id: request.id,
                        sn: request.sn,
                        action: "worker-mouse",
                        'type': request.action,
                        'button': request.button,
                        'x': current_x,
                        'y': current_y}, function(response) {
                        console.log('worker-mouse done: ', response.result, request.action, request.button, current_x, current_y);
                    });
                }
                sendResponse({});
            }
        } else if ((request.action == "2")) {
            if (window.frameElement) {
                console.log('In one frame, do nothing');
                return;
            }
            var lower_product = request.product.toLowerCase();
            let [elt, temp_verify, arrIframes] = verifyElement(request);

            if (!elt) {
                console.log('Get element failed: ', request.xpath);
                vtaas.contentWorker.sendReplayFinishedMessage(request.id, request.sn, 'failed', 'Get element failed: ' + request.xpath);
            } else {
                elt.value = request.value;
                var event = document.createEvent('Event');
                event.initEvent('change', false, true)
                elt.dispatchEvent(event);
                vtaas.contentWorker.sendReplayFinishedMessage(request.id, request.sn);
            }
        } else if (request.action == "nainput") {
            console.log("nainput", request);
            domElement = document.activeElement;
            if (domElement) {
                while(domElement.contentDocument) {
                    domElement = domElement.contentDocument.activeElement;
                }
                if (domElement.tagName == "TEXTAREA" || domElement.tagName == 'INPUT') {
                    domElement.value = request.nastring;

                } else if (domElement.hasAttribute('contenteditable')) {
                    domElement.innerText = request.nastring;
                }
                var evt = document.createEvent('HTMLEvents');
                evt.initEvent('change', true, false);
                domElement.dispatchEvent(evt);
            }
            sendResponse({});
        } else if (request.action == "worker_refresh") {
            console.log("worker_refresh", request);
            window.location.reload(true);
            vtaas.contentWorker.sendReplayFinishedMessage(request.id, request.sn);
        } else if (request.action == "worker_message") {
            console.log("worker_message", request);
            // var message = request.message;
            // var el = document.createElement("div");
            // el.setAttribute("style","position:absolute;top:40%;left:20%;background-color:white;");
            // el.innerHTML = "<p style='margin-left:3em; margin-right:3em;font-size:32px;color:green;'>" + message + "</p>";
            // setTimeout(function(){
            //     el.parentNode.removeChild(el);
            // },2000);
            // document.body.appendChild(el);
            sendResponse({});
        } else if (request.action == "unlocal_check") {
            console.log("unlocal_check", request);
            var english_value = request.verify_value;
            var glossary = request.glossary;
            var n
                , walk = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null, false);
            while (n = walk.nextNode()) {
                var ignore = { "STYLE": 0, "CODE": 0, "SCRIPT": 0, "NOSCRIPT": 0, "IFRAME": 0, "OBJECT": 0 }
                if (n.parentNode.tagName in ignore || n.parentNode instanceof HTMLUnknownElement) {
                    continue;
                }
                var node_text = n.textContent.trim();
                if (glossary.indexOf(node_text) !== -1) {
                    continue;
                }
                if (node_text.length > 0){
                    if (english_value.indexOf(node_text) !== -1) {
                        // same text
                        //var orig_text = n.innerHTML;
                        //console.log(orig_text);
                        //n.innerHTML = "<span style='background-color:#FFEA0'>" + orig_text + "</span>";
                        var span = document.createElement("span");
                        span.style.backgroundColor = "#FF9900";
                        span.appendChild(document.createTextNode(node_text));
                        n.parentNode.insertBefore(span, n);
                        n.textContent='';
                    }
                }
            }
            var message = 'Unlocal Check Done!';
            var el = document.createElement("div");
            el.setAttribute("style","position:absolute;top:40%;left:20%;background-color:white;");
            el.innerHTML = "<p style='margin-left:3em; margin-right:3em;font-size:32px;color:green;'>" + message + "</p>";
            setTimeout(function(){
                el.parentNode.removeChild(el);
            },2000);
            document.body.appendChild(el);
            vtaas.contentWorker.sendReplayFinishedMessage(request.id, request.sn);
        } else if (request.action == "screenshot_element_rect") {
            let [elt, temp_verify, arrIframes, currentIframe] = verifyElement(request);
            if (elt) {
                if (request.sendverify) {
                    let verify_message = {
                        action: "worker-status",
                        event_id: request.id,
                        status: 'sendverify',
                        message: temp_verify
                    }
                    chrome.runtime.sendMessage(verify_message);
                }

                let framePosition = findPos2(currentIframe);
                let elementRect = elt.getBoundingClientRect();
                let resultRect = {
                    left: framePosition.left + elementRect.left,
                    top: framePosition.top + elementRect.top,
                    width: elementRect.width,
                    height: elementRect.height
                }
                sendResponse(resultRect);
            } else {
                console.log('Can not find element in request', request);
                // TODO: Send notification to user.
            }
        } else if (request.action == "assert") {
            let [elt, temp_verify, arrIframes] = verifyElement(request);
            if ((elt) && (request.sendverify)) {
                var verify_message = {
                    action: "worker-status",
                    event_id: request.id,
                    status: 'sendverify',
                    message: temp_verify
                }
                chrome.runtime.sendMessage(verify_message);
                vtaas.contentWorker.sendReplayFinishedMessage(request.id, request.sn);
            } else {
                console.log('Can not find element in request', request);
                // TODO: Send notification to user.
            }
        }
    });
}

if (!window.frameElement) {
    console.log('Content Script End:', new Date().toLocaleString());
    // initRecorderDom();
    chrome.runtime.sendMessage({action: "worker-status", 'event_id': 0, 'status': 'script-end', 'message': ''});
}
