const utils = require('../utils');
const chai=require("chai");
const should=chai.should();
const expect=chai.expect;


var Actor = function(driver, rootConf) {
    this.name = 'common';
    this.driver = driver;
    this.rootConf = rootConf;
    this.actions = ['open', 'direct', 'mousedown', 'keydown', 'type', 'screenshot', 'assert',
                    'close', 'execute', 'browserprompt', 'tabswitch', 'mouseover',
                    'select'];
    this.priority = 3;
    this.screenshotPath = rootConf.screenshotPath;
    this.BASE_TIMEOUT=30000;
    this.SLEEP_TIME = 1000;
    this.BASE_DEEPTH = 20;
    this.XPATH2_DEEPTH = 0;
    this.XPATH3_DEEPTH = 0;

    function _(str){
        if(typeof str=='string'){
            return str.replace(/\{\{(.+?)\}\}/g,function(all,key){
                return testVars[key] || '';
            });
        }
        else{
            return str;
        }
    }

    function addUpdateReportEntry(event_id,update_type,message,label){
        let replayconfig_type = update_type;
        // if (events[event_id]['replayoption'] != 'hard') {
        //     replayconfig_type = replayconfig_type + '[' + events[event_id]['replayoption'] + ']'
        // }
        update_entry={
            "event_id":event_id,
            "update_type":replayconfig_type,
            "message":message,
            "label":label?((label.length>128)?label.substring(0,127):label):""
        };
        utils.info('adding update report entry:', JSON.stringify(update_entry));
        rootConf['test_results_dict'].update_entries.push(update_entry);
    }

    function needLocating(eventData) {
        if (eventData.obj_xpath3) {
            return true;
        } else {
            return false;
        }
    }

    this.userevent = async function(action, eventData) {
        utils.info('common running: ', eventData);
        if (!eventData.locatorSequence) {
            eventData.locatorSequence = ['xpath3', 'xpath2', 'xpath', 'css_selector'];
        }
        if (needLocating(eventData)) {
            eventData = await locate(this, eventData);
            // utils.info('located: ', eventData);
        }

        if (action == 'open') {
            let defaultStartURL = eventData.openurl;
            if (this.rootConf.start_url) {
                defaultStartURL = this.rootConf.start_url;
            }
            if (eventData.custom_starturl) {
                defaultStartURL = eventData.custom_starturl;
            }
            addUpdateReportEntry(eventData.id, eventData.action,'',defaultStartURL);
            utils.info('openning URL: ', defaultStartURL);
            rootConf['current_url'] = defaultStartURL;
            try {
                await this.driver.url(_(defaultStartURL));
                await this.driver.wait('body',300000).html().then(function(code){
                    isPageError(code).should.be.false;
                });
            } catch(e) {
                throw 'Open url timeout: ' + defaultStartURL;
            }
        } else if (action == 'direct') {
            try {
                let defaultStartURL = eventData.openurl;
                console.log('------------>', eventData.id, eventData.action,'',defaultStartURL);
                addUpdateReportEntry(eventData.id, eventData.action,'',defaultStartURL);
                console.log('------------>', rootConf['test_results_dict']);
                rootConf['current_url'] = defaultStartURL;
                await this.driver.url(_(defaultStartURL));
                await this.driver.wait('body',300000).html().then(function(code){
                    isPageError(code).should.be.false;
                });
            } catch(e) {
                console.log("-->open url timeout, continue.", eventData);
            }
        } else if (action == 'mousedown') {
            let element = await this.selectElement(eventData);
            if (!element) {
                throw 'Locate element failed: ' + eventData.id;
            }
            if (eventData.clicktype != 'single_click_js') {
                var position = [1,1]; // [width, height]
                await element.size(function(error,ret){
                    let pWidth = Math.round(eventData.percentX * ret.width);
                    let pHeight = Math.round(eventData.percentY * ret.height);
                    position = [pWidth, pHeight];
                    error_code=0;
                });
                let element_display = await element.attr('display');
                let element_visibility = await element.attr('visibility');
                let element_type = await element.attr('type');
                elementText = await element.text();
                if (!elementText) { elementText = await element.val();}
                if (element_type == 'password') {
                    elementText = '*';
                }
                await addUpdateReportEntry(eventData.id, eventData.action, '', elementText);
                utils.debug("Ready to single click on: %s, display/visibility: %s/%s", position, element_display, element_visibility);
                let filepath = this.screenshotPath + '/' + this.rootConf.caseName + '_' + this.rootConf.stepId;
                await utils.autoScreenshot(this.driver, filepath);
                utils.info('autoScreenshot done: ', eventData.id, action, filepath);
                try {
                    await element.mouseMove(position[0],position[1]).sleep(1000).click(parseInt(0, 10),function(error){
                        utils.info('Single click done, eventid = %s, error = %s', eventData.id, error);
                    });
                } catch {
                    throw 'Single click element failed: ' + eventData.id;
                }
            } else {
                let xpath2 = eventData.obj_selector;
                var get_element_func=getElementFunc(xpath2);
                var func2 = get_element_func + 'getElement().click();return getElement().innerText;';
                await this.driver.sleep(200).eval(func2, function(error, result){
                    if (!error) {
                        addUpdateReportEntry(eventData.id, eventData.action, '', result);
                    }
                    utils.debug(eventData.id, 'JS click error:', error);
                });
            }

        } else if (action == 'type') {
            let element = await this.selectElement(eventData);
            if (!element) {
                utils.info(action, ':', eventData.id, 'Element not located.');
            } else {
                try{
                    // VIU-2966: remove clear()
                    // await element.clear();
                    // VIU-2205
                    // VIU-2227
                    let orig_str = '';
                    let input_value = eventData.obj_value;
                    let input_arr = eventData.obj_value.split('%%');
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
                    let real_input_value = input_value.replace(/{ENTER}/g, '\n');
                    let current_value = await element.val();
                    let init_try = 0;
                    while((init_try < 3) && (current_value != real_input_value)) {
                        utils.debug('Send_key init try: ', current_value, '-->', real_input_value);
                        await driver.sleep(200);
                        await element.val(real_input_value);
                        current_value = await element.val();
                        init_try += 1;
                    }
                    while(current_value != real_input_value) {
                        utils.debug('Change element value: ', current_value, '-->', real_input_value);
                        await driver.sleep(200);
                        await element.clear();
                        current_value = await element.val();
                        while(current_value != "") {
                            await element.dblClick();
                            await driver.sleep(10).keyDown('BACK_SPACE');
                            current_value = await element.val();
                        }
                        await element.val(real_input_value);
                        current_value = await element.val();
                    }
                }catch (error){
                    utils.error(event_id,'send key error:',error);
                }
            }
            addUpdateReportEntry(eventData.id, eventData.action, '', eventData.obj_value);
        } else if (action == 'mouseover') {
            let element = await this.selectElement(eventData);
            if (!element) {
                throw 'Locate element failed: ' + eventData.id;
            }
            var event_id = eventData.id;
            var position = [1,1]; // [width, height]
            await element.size(function(error,ret){
                let pWidth = Math.round(eventData.percentX * ret.width);
                let pHeight = Math.round(eventData.percentY * ret.height);
                position = [pWidth, pHeight];
                error_code=0;
            });
            try {
                await element.mouseMove(position[0],position[1]);
                utils.info('Mouse over done, eventid = %s', eventData.id);
            } catch {
                throw 'Replay mouseover action failed: ' + eventData.id;
            }
        } else if (action == 'select') {
            let element = await this.selectElement(eventData);
            if (!element) {
                throw 'Locate element failed: ' + eventData.id;
            }

            if (!eventData.reference) {
                throw 'Cannot replay select action: no reference, ' + eventData.id;
            }
            var event_id = eventData.id;
            var position = [1,1]; // [width, height]
            await element.size(function(error,ret){
                let pWidth = Math.round(eventData.percentX * ret.width);
                let pHeight = Math.round(eventData.percentY * ret.height);
                position = [pWidth, pHeight];
                error_code=0;
            });

            try {
                await element.mouseMove(position[0],position[1]).sleep(1000).click(0);
                utils.info('Single click done, eventid = %s', eventData.id);
                let select_options = ['text', 'value', 'index'];
                let values = eventData.reference.split(';');
                for (i in select_options) {
                    let option = select_options[i];
                    let current_value = null;
                    if (i == 0) {
                        // text
                        current_value = values[1];
                    } else if (i == 1) {
                        // value
                        current_value = values[0];
                    } else if (i == 2) {
                        // index
                        current_value = values[2];
                    }
                    let rst = await this.selectOperationRaw(event_id, element, option, current_value);
                    if (!rst) {
                        // VIU-1825: update Select label per selection item
                        await addUpdateReportEntry(event_id, 'select', '', current_value);
                        break;
                    }
                }
            } catch {
                throw 'Replay select action failed: ' + eventData.id;
            }
        } else if (action == 'screenshot') {
            // manual screenshot
            let screenshot = null;
            let areaInfo = JSON.parse(eventData.areatype);
            let filepath = this.screenshotPath + '/' + this.rootConf.caseName + '_' + this.rootConf.stepId;
            utils.debug('====> filepath: ', filepath);
            utils.debug('Screenshot eventData: ', eventData, areaInfo, areaInfo.areaType);
            if (areaInfo.areaType != 'element') {
                screenshot = await utils.takeScreenshot(this.driver, filepath, {areaType: areaInfo.areaType});
            } else {
                let element = await this.selectElement(eventData);
                if (!element) {
                    utils.debug(action, ':', eventData.id, 'Element not located.');
                } else {
                    utils.debug(action, ':', eventData.id, 'Element:', this.element);
                    let size = await element.size();
                    let offset = await element.offset();
                    let elementRect = {x: offset.x, y: offset.y, width: size.width, height: size.height};
                    screenshot = await utils.takeScreenshot(this.driver, filepath, {areaType: areaInfo.areaType, elementRect});
                }
            }
            eventData.screenshot = filepath + '.png';
            // utils.debug('eventData: ', eventData, filepath, screenshot);
            addUpdateReportEntry(eventData.id, eventData.action, '', eventData.name + '[' + areaInfo.areaType + ']');
        } else if (action == 'keydown') {
            await this.driver.sleep(1).keyDown(eventData.key);
            addUpdateReportEntry(eventData.id, eventData.action, '', eventData.key);
        } else if (action == 'keyup') {
            await this.driver.sleep(1).keyUp(eventData.key);
            addUpdateReportEntry(eventData.id, eventData.action, '', eventData.key);
        } else if (action == 'assert') {
            let event_id = eventData.id;
            let BASE_TIMEOUT = rootConf.BASE_TIMEOUT;
            let element = await this.selectElement(eventData);
            if (!element)  {
                utils.error('Assert failed: Element not located. ', event_id);
            }
            let assertInfo = JSON.parse(eventData.obj_assert);
            let assert_sleep = assertInfo.sleep; // may not used in the future
            // Old test cases may use string type
            if (typeof assert_sleep === 'string'){
                assert_sleep = parseInt(assert_sleep, 10);
            }
            let totalwait = eventData.total_sleep_time;
            utils.debug(event_id, 'assert_sleep dropped: ', assert_sleep, '->', totalwait);
            let left_wait = 1; // verify assert firstly
            while(left_wait > 0) {
                try {
                    switch(assertInfo.type){
                        case 'value':
                            assertActual=await element.val();
                            break;
                        case 'text':
                            assertActual=await element.text();
                            // Try hidden element text
                            if (assertActual.replace(/\u00A0/g,' ').replace(/\n/g,' ').trim() == '') {
                                assertActual=await element.prop('textContent');
                            }
                            assertActual=assertActual.replace(/\u00A0/g,' ').replace(/\n/g,' ').trim();
                            assertInfo.expect=assertInfo.expect.replace(/\u00A0/g,' ').replace(/\n/g,' ').trim();
                            break;
                        case 'displayed':
                            assertActual=await element.displayed();
                            break;
                        case 'enabled':
                            assertActual=await element.enabled();
                            break;
                        case 'selected':
                            assertActual=await element.selected();
                            break;
                        default:
                            utils.error('The assertion type is not valid:',assertInfo.type);
                            break;
                    }
                    switch(assertInfo.operator){
                        case 'equal':
                            expect(assertActual).to.equal(assertInfo.expect);
                            break;
                        case 'notEqual':
                            expect(assertActual).to.not.equal(assertInfo.expect);
                            break;
                        case 'include':
                            expect(assertActual).to.include(assertInfo.expect);
                            break;
                        case 'notInclude':
                            expect(assertActual).to.not.include(assertInfo.expect);
                            break;
                        case 'isAbove':
                            expect(assertActual).to.be.above(assertInfo.expect);
                            break;
                        case 'isBelow':
                            expect(assertActual).to.be.below(assertInfo.expect);
                            break;
                        case 'match':
                            let matchPattern = new RegExp(assertInfo.expect, 's');
                            expect(assertActual).to.match(matchPattern);
                            break;
                        case 'notMatch':
                            let notMatchPattern = new RegExp(assertInfo.expect, 's');
                            expect(assertActual).to.not.match(notMatchPattern);
                            break;
                        default:
                            utils.error('The assertion operator is not valid:',assertInfo.operator);
                            break;
                    }
                    await addUpdateReportEntry(event_id, action, "", assertActual);
                } catch (err) {
                    left_wait = await utils.smartWait(this.driver, eventData.replaytime, totalwait);
                    if (left_wait <= 0) {
                        // wait time used up
                        utils.debug(nerr.stack||err.message||err);
                        // VIU-1664 vTaaS automation:revise assert message
                        assertMessage="Assert Attributes: <b>ASSERTTYPE / "+ assertInfo.type + " / " + assertInfo.operator  +"</b>"
                            +"<br>&nbsp;&nbsp;&nbsp;Expected Value: <b>"+assertInfo.expect+"</b>"
                            +"<br>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Actual Value: <b>"+assertActual+"</b>"
                        utils.debug(event_id,'replayoption',eventData['replayoption']);
                        if(eventData['replayoption'] == 'hard'){
                            assertMessage=assertMessage.replace("ASSERTTYPE","hard assert");
                            addUpdateReportEntry(eventData.id, eventData.action, assertMessage,assertActual);
                            throw "Expected:"+assertInfo.operator+' '+assertInfo.expect+" and element has attribute "+assertInfo.type+" Actual:"+assertActual;
                        }else if (eventData['replayoption'] == 'soft'){
                            error_code=-1;
                            // vtaas_test_results.soft_failed +=1;
                            assertMessage=assertMessage.replace("ASSERTTYPE","soft assert");
                            addUpdateReportEntry(eventData.id, eventData.action, assertMessage, assertActual);
                        } else {
                            // optional
                            error_code=-1;
                            assertMessage=assertMessage.replace("ASSERTTYPE","optional assert");
                            addUpdateReportEntry(eventData.id, eventData.action, assertMessage,assertActual);
                        }
                        break;
                    }
                }
            }
        } else if (action == 'execute') {
            utils.info('execute',eventData.id, eventData);
            let event_id = eventData.id;
            let commandLine = eventData.command;
            let result = eventData.expect;
            let cmd = eventData.command;
            if (eventData.host === 'localhost') {
                var process = require('child_process');
                try{
                    process.exec(cmd, function(error, stdout, stderr) {
                        utils.debug(event_id, "error:"+error, "stdout:"+stdout, "stderr:"+stderr);
                        if (result.length > 0){
                            if (!stdout.includes(result)){
                                let expectPattern = new RegExp(result, 's')
                                if (!expectPattern.test(stdout)){
                                    throw `The SSH command result is wrong, Expected to contains:${result}, But actual result:${stdout}`;
                                }
                            }
                        }
                    });
                }catch (error){
                    console.error('',event_id,'Execute SSH command failed:',error.toString(),'\n');
                    throw error.toString();
                }
            } else {
                let SSH2Promise=require('ssh2-promise');

                let config={
                    host:eventData.host,
                    port:eventData.port,
                    username:eventData.username,
                    password:eventData.password,
                    tryKeyboard:true
                };

                // Workaround for SSH2 promise "keyboard-interactive" log in does not fit here
                SSH2Promise.Utils.prompt=function(q,cb){
                    cb(hostInfo.password);
                };

                let ssh=new SSH2Promise(config);

                try{
                    await ssh.connect();
                    let commandOutput=await ssh.exec(commandLine);
                    utils.debug(event_id,'SSH command output:',commandOutput);
                    if (result.length > 0){
                        if (!commandOutput.includes(result)){
                            let expectPattern = new RegExp(result, 's')
                            if (!expectPattern.test(commandOutput)){
                                throw `The SSH command result is wrong, Expected to contains:${result}, But actual result:${commandOutput}`;
                            }
                        }
                    }
                }catch (error){
                    console.error('',event_id,'Execute SSH command failed:',error.toString(),'\n');
                    throw error.toString();
                }finally{
                    await ssh.close();
                }
            }
        } else if (action == 'browserprompt') {
            utils.info('browserprompt', eventData.id, eventData);
            let prompt_type = eventData.prompt_type;
            let prompt_value = eventData.prompt_value;
            if (prompt_type=='alert') {
                await this.driver.sleep(3000).acceptAlert();
                addUpdateReportEntry(eventData.id, eventData.action, '', prompt_type);
            } else if (prompt_type == 'confirm') {
                if (prompt_value == 'true') {
                    await this.driver.sleep(3000).acceptAlert();
                } else {
                    await this.driver.sleep(3000).dismissAlert();
                }
                addUpdateReportEntry(eventData.id, eventData.action, '', prompt_type+"[" + prompt_value + "]");
            } else if (prompt_type == 'prompt') {
                await this.driver.sleep(3000).setAlert(prompt_value);
                await this.driver.sleep(2000).acceptAlert();
                addUpdateReportEntry(eventData.id, eventData.action, '', prompt_type+"[" + prompt_value + "]");
            }
        } else if (action == 'tabswitch') {
            utils.info('tabswitch', eventData.id, eventData);
            var allwindows = await this.driver.windowHandles();
            var lastWindowId = allwindows.length-1;
            await this.driver.switchWindow(lastWindowId);
            utils.info('switchWindow: ', lastWindowId);
        } else if (action == 'end_test') {
            addUpdateReportEntry(eventData.id, eventData.action, '', 'end_test');
        }
        return eventData;
    };

    this.selectElement = async function(eventData) {
        let elements = eventData.elements;
        let locators = eventData.locatorSequence;
        if ((!elements) || (!locators)) {
            return null;
        }

        for (i in locators) {
            let current_locator = locators[i];
            if (!elements[current_locator]) {
                continue;
            }
            let locator_result = elements[current_locator];
            if (locator_result.actual_length == 1) {
                for (let i=0; i < locator_result.elements.elementIds.length; i++){
                    if (locator_result.elements.elementIds[i] !== undefined) {
                        return locator_result.elements.get(i);
                    }
                 }
            }
        }

        return null;
    };

    this.selectOperationRaw = async function(event_id, element, select_type, select_value){
        try{
            if(!select_value){
                utils.debug("%s select failed: type = %s | value=%s", event_id, select_type, select_value);
                return 1;
            }
            // if(select_type=='index'){
            //     var func=getElementFunc(element.value)+'return getElement().children.length;';
            //     var err_code= await driver.sleep(200).eval(func,function(error,result){
            //         utils.debug(event_id,'there are '+result+' options in the select and the selected index is '+select_value+'.\n  Error:',error,'\n');
            //         if(error!=null){
            //             utils.debug(event_id,error,'\n');
            //             return 1;
            //         }else if(result<=select_value){
            //             utils.debug(event_id,'the index '+select_value+' is out of range('+result+')');
            //             return 1;
            //         }else{
            //             return 0;
            //         }
            //     });
            //     if(err_code!=0){
            //         return err_code;
            //     }
            // }
            await element.select({type:select_type, value:select_value});
            utils.debug("%s select option by type = %s | value=%s", event_id, select_type, select_value);
            return 0;
        } catch (error) {
            utils.error(event_id, error);
            return 1;
        }
    }
}


// return ancestor
function sharedAncestor(xpath2_old, xpath2_refer_old, xpath2_refer_new){
    // get shortest common xpath part
    var A = xpath2_old.split('/');
    var B = xpath2_refer_old.split('/');
    var C = xpath2_refer_new.split('/');
    var L = (A.length<=B.length)?A.length-1:B.length-1;
    var i = 0;
    while(i<L && A[i]=== B[i]) i++;
    var ancestor = C.slice(0,i).join('/');
    return ancestor;
}

// return xpath3 last contains part
function xpath3Contains(xpath3){
    var A = xpath3.split('/');
    var lastNode = A[A.length-1];
    if (lastNode.includes('[contains')) {
        var B = lastNode.split('[contains');  // last node and after [contains
        lastNode = '//*[contains' + B[B.length-1];
    } else {
        lastNode = '//' + lastNode;
    }
    return lastNode;
}

// return xpath2_new, xpath3_new
function applyAncestor(ancestor, xpath2, xpath3) {
    var contains = xpath3Contains(xpath3);
    var xpath3_new = ancestor + contains;

    // A.length should > B.length, otherwise certain error which might cause unable to find element
    var A = xpath2.split('/');
    var B = ancestor.split('/');
    var L = (A.length<=B.length)?A.length:B.length;
    var i = 0;
    while(i<L) { A[i]=B[i]; i++; }
    var xpath2_new = A.join('/');
    return [xpath2_new, xpath3_new];
}

function getElementXpath2NewByRefer(xpath2_old, xpath3_old, xpath2_refer_old, xpath2_refer_new) {
    // get same parts between xpath2_old; xpath2_refer_old
    var ancestor = sharedAncestor(xpath2_old, xpath2_refer_old, xpath2_refer_new);
    return applyAncestor(ancestor, xpath2_old, xpath3_old);
}

async function setup(driver, rootConf) {
    utils.info('common: setup');
    return new Actor(driver, rootConf);
}
async function teardown() {
    utils.info('common: teardown');
}

function isPageError(code){
    return code=='' || / jscontent="errorCode" jstcache="\d+"|diagnoseConnectionAndRefresh|dnserror_unavailable_header|id="reportCertificateErrorRetry"|400 Bad Request|403 Forbidden|404 Not Found|500 Internal Server Error|502 Bad Gateway|503 Service Temporarily Unavailable|504 Gateway Time-out/i.test(code);
}

function getElementFunc(elmt){
    var get_element_func='function getElement(){return document.querySelector("'+elmt.replace(/"/g,'\\"')+'");};'
    if((elmt.startsWith('/HTML'))||(elmt.startsWith('//'))){
        get_element_func='function getElement(){return document.evaluate("'+elmt.replace(/"/g,'\\"')+'",document,null,XPathResult.FIRST_ORDERED_NODE_TYPE,null).singleNodeValue;};'
    }
    return get_element_func;
}

async function locate(actor, eventData) {
    console.log('common.locate started: ', eventData.id);
    // First, we need to Get iframe_list from eventData.verify_value and switchIframe
    await userEventSwitchIFrame(actor, eventData);
    // Second, we init related vars, including all posible elements, timeout, time_start and time_elapsed
    eventData = init_per_element_vars(actor, eventData);
    // Three, start to locate, it should return updated eventData
    return await userEventAsync(actor, eventData);
}

async function userEventSwitchIFrame(actor, eventData) {
    let event_id = eventData.id;
    console.log('custom.switchIframe started: ', event_id);

    // Get iframe_list from eventData.verify_value
    iframe_list=eventData.verify_value?eventData.verify_value.split(';')[0]:'null|null|null';
    iframes=iframe_list.split(',');
    inner_iframe_str=iframes[iframes.length-1].split('|');
    inner_iframe_xpath=inner_iframe_str[2];
    inner_iframe_identity=inner_iframe_xpath;
    if(inner_iframe_identity=='null'){
        try {
            await actor.driver.switchFrame(null).wait('body',actor.BASE_TIMEOUT*4);
        } catch(e) {
            console.log('-->switch frame timeout, continue.');
        }
        console.log(new Date().toISOString(), '-> ','',event_id,'Switched to the main frame\n');
    }else if(inner_iframe_identity=='undefined'){
        console.log(new Date().toISOString(), '-> ','',event_id,'Missed the frame ...\n');
    }else{
        console.log(new Date().toISOString(), '-> ','',event_id,'Switched to the main frame, then switch to target frame one by one\n');
        await userEventSwitchIFrameAsyncRaw(actor, event_id, 'null|null|null');
        await userEventSwitchIFrameAsync(actor, event_id,iframes,0).then(function(){
            actor.error_msg=null;
            if(actor.error_code==1){
                actor.error_msg='Failed to switch to the iframe:'+iframes[iframes.length-1];
            }
            if(actor.error_msg!=null){
                console.log(new Date().toISOString(), '-> ','',event_id,actor.error_msg,'\n');
                throw actor.error_msg;
            }
        });
    }
}

function getCountTagWithIndex(path){
    return path.split("]/").length;
}

function jwebdriverElementsLength(elements) {
    let actualLength = 0;
    for (let i=0; i < elements.elementIds.length; i++){
       if (elements.elementIds[i] !== undefined) {
           actualLength++;
       }
    }
    return actualLength;
}

function init_per_element_vars(actor, eventData) {
    actor.XPATH2_DEEPTH=getCountTagWithIndex(eventData.obj_xpath2);
    actor.XPATH3_DEEPTH=getCountTagWithIndex(eventData.obj_xpath3);
    // mark found by XPath type
    actor.foundby_type='';
    actor.foundby_xpath='';
    // init this.candidateElements
    actor.candidateElements = {
        "baseWeight": actor.baseWeight,
        "baseFoundByLen": actor.baseFoundByLen,
        "baseDistance" : actor.baseDistance,
        "identity": eventData.obj_xpath2,
        "topWeight": 0,
        "topElementId": "",
        "nearestDistance": 40000,
        "nearestElementId": "",
        "candidateIds": [],
        "foundby_type": "",
        "foundby_type_len": 0,
        "foundby_xpath": "",
        "foundby_candidate": false
    };
    eventData.elements = {};
    eventData.timeout_locator = actor.BASE_TIMEOUT*4 + (eventData.sleep_time?eventData.sleep_time:0);
    return eventData;
}


async function userEventSwitchIFrameAsync(actor, event_id, iframes, index){
    if (!actor) {
        return;
    }
    return await userEventSwitchIFrameAsyncRaw(actor, event_id, iframes[index]).then(code=>{
        if(code == 0){
            if(index < iframes.length-1){
                index += 1;
                return userEventSwitchIFrameAsync(actor, event_id, iframes, index);
            }
            return;
        }
        else{
            return;
        }
    });
}

async function userEventSwitchIFrameAsyncRaw(actor, event_id, iframe){
    try {
        iframe_str = iframe.split('|');
        iframe_xpath = iframe_str[2];
        iframe_identity = iframe_xpath;
        iframe_id = iframe_str[0];
        let driver = actor.driver;
        let BASE_TIMEOUT = actor.BASE_TIMEOUT;
        if(iframe_identity == 'null'){
            iframe_identity = null;
        }
        return await driver.sleep(1000).switchFrame(iframe_identity).wait('body', BASE_TIMEOUT*4).then(function(){
            if(iframe_id=='null'){
                console.log(new Date().toISOString(), '-> ','',event_id,'Succeeded to switch to the main frame\n');
            }else{
                console.log(new Date().toISOString(), '-> ','',event_id,'Succeeded to switch to the frame:',iframe_id,'by',iframe_identity,'\n');
            }
            return 0;
        });
    }
    catch (error){
        console.log(new Date().toISOString(), '-> ','',event_id,error,'\n');
        return 1;
    }
}

async function userEventAsync(actor, eventData, index=1){
    // move mouse to avoid session timeout, wait for 1s
    left_wait = await utils.smartWait(actor.driver, eventData.replaytime, eventData.timeout_locator, 1000);

    // start to loop and find element
    console.log('===>', index, actor.BASE_DEEPTH, actor.XPATH2_DEEPTH, actor.XPATH3_DEEPTH);
    if(left_wait && (index < (actor.BASE_DEEPTH+actor.XPATH2_DEEPTH+actor.XPATH3_DEEPTH+3) ) ){
        var mode = index%4;
        if (mode ==1 ){
            elmt = eventData.obj_xpath3;
            actor.foundby_type = "xpath3";
        } else if (mode == 2){
            elmt=eventData.obj_xpath2;
            actor.foundby_type = "xpath2";
        } else if (mode == 3){
            elmt = eventData.obj_xpath;
            actor.foundby_type="xpath";
        } else if (mode == 0){
            elmt = eventData.obj_selector;
            actor.foundby_type="css_selector";
        }

        console.log(new Date().toISOString(), '-> ','',eventData.id,'index',index,'elmt',elmt+'\n');
        result = await userEventAsyncTest(actor, eventData.id, elmt, 1000, eventData.obj_text);
        if ((actor.foundby_type) && (result)) {
            eventData.elements[actor.foundby_type] = result;
            console.log('++> ', result.actual_length, 'elements located by ', actor.foundby_type);
        }
        if (result.actual_length == 1) {
            return eventData;
        } else {
            index += 1;
            console.log('--> Try next foundby_type: index = ', index);
            return await userEventAsync(actor, eventData, index);
        }
    } else {
        console.log(new Date().toISOString(), '-> locating time out.');
        return eventData;
    }
}


async function userEventAsyncTest(actor, event_id,elmt,timeout,label=''){
    try{
        let element_result = null;
        let driver = actor.driver;
        let elements = await driver.sleep(1000).wait(elmt,timeout);
        let elementLength = jwebdriverElementsLength(elements);
        var result = {
            "actual_length": elementLength,
            "elements": elements,
        };
        return result;
    }
    catch (error){
        console.log(new Date().toISOString(), '-> ','',event_id,error,'\n');
        var result = {
            "actual_length": 0,
            "elements": null,
        };
        return result;
    }
}

exports.setup = setup;
exports.teardown = teardown;
exports.locate = locate;