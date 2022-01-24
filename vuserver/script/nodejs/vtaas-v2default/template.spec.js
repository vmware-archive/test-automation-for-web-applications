const fs=require('fs');
const path=require('path');
const chai=require("chai");
const should=chai.should();
const expect=chai.expect;
const JWebDriver=require('jwebdriver');
chai.use(JWebDriver.chaiSupportChainPromise);
const resemble=require('resemblejs-node');
resemble.outputSettings({errorType:'flatDifferenceIntensity'});
const utils = require('./utils');
utils.setlevel(3);

// vTaaS Script Version
// todo: move it to config.json, name as template name/info
const vtaas_script_ver='2021.11';

const rootPath = getRootPath();
let root_config_filename = rootPath + '/config.json';
let rootConf = require(root_config_filename);
let test_events_filename = rootPath + '/script/test.events.json';
let test_events = require(test_events_filename);
rootConf['BASE_DIR'] = rootPath;
rootConf['test_results_file'] = './reports/results.json';
rootConf['test_results_dict'] = {
    stats : {
        "result": false,
        "suites": 1,
        "tests": 0,
        "passes": 0,
        "pending": 0,
        "failures": 0,
        "start": null,
        "end": null,
        "duration": 0,
        "testsRegistered": 0,
        "passPercent": 0,
        "pendingPercent": 0,
        "other": 0,
        "hasOther": false,
        "skipped": 0,
        "hasSkipped": false,
        "passPercentClass": "success",
        "pendingPercentClass": "danger",
    },
    soft_failed: 0,
    update_entries: [],
    interactions:[]
};
rootConf['current_eventid'] = 0;
rootConf['current_action'] = '';
rootConf['current_url'] = '';

var supported_actions = {};
var loaded_packages = [];
// LOADING SPEC

module.exports = function() {
    let driver,testVars;

    before(function(){
        let self=this;
        driver=self.driver;
        testVars=self.testVars;

    });
    var eventData = {};
    for (idx in test_events['events']) {
        eventData = test_events['events'][idx];
        if (eventData.id && eventData.action) {
            replay(eventData.id, eventData.action, eventData);
        }
    }

    it('end_test',async function(){
        rootConf['current_eventid'] = 0;
        rootConf['current_action'] = 'end_test';
    });
    function replay(event_id, action, eventData){
        let eventDesc = event_id + ":" + action;
        utils.info("eventDesc", eventDesc);
        eventData.replaytime = new Date();
        eventData.description = eventDesc;
        it(eventDesc.toString(), async function() {
            rootConf['current_eventid'] = event_id;
            rootConf['current_action'] = action;
            rootConf['mocha'] = this;
            let action_packages = supported_actions[action];
            // console.log(new Date().toISOString(), '-> ', 'Starting replay: ', event_id, action_packages);
            // call package replay
            let i_packages = 0;
            for (i in action_packages) {
                let packageOBJ = action_packages[i];
                // console.log("packageOBJ: ", packageOBJ);
                if (packageOBJ) {
                    // userevent
                    utils.info("%s running %s", packageOBJ.name, eventData.id);
                    i_packages += 1;
                    result = await packageOBJ.userevent(eventData.action, eventData);
                    if (result) {
                        if (result.id == eventData.id) {
                            eventData = result;
                        }
                    }
                }
            }
            if (!i_packages) {
                utils.info('No package for event: ', eventData.id, action);
            }
        });
    }
}

if(module.parent && /mocha\.js/.test(module.parent.id)){
    runThisSpec();
}

function runThisSpec(){
    // read config
    let BASE_TIMEOUT = 30000;
    let webdriver = process.env['webdriver'] || '';
    let proxy = process.env['wdproxy'] || '';
    let webdriverConfig = Object.assign({}, rootConf.webdriver);
    let host = webdriverConfig.host;
    let port = webdriverConfig.port || 4444;
    let match = webdriver.match(/([^\:]+)(?:\:(\d+))?/);
    if (match) {
        host = match[1] || host;
        port = match[2] || port;
    }
    let testVars = rootConf.vars;
    locale = rootConf.locale;
    serverUrl = rootConf.server;

    let browsers = webdriverConfig.browsers;
    browsers = browsers.replace(/^\s+|\s+$/g,'');
    delete webdriverConfig.host;
    delete webdriverConfig.port;
    delete webdriverConfig.browsers;

    // read hosts
    let hostsPath = rootPath+'/hosts';
    let hosts='';
    if(fs.existsSync(hostsPath)) {
        hosts = fs.readFileSync(hostsPath).toString();
    }
    let specName = path.relative(rootPath, __filename).replace(/\\/g,'/').replace(/\.js$/,'');
    browsers.split(/\s*,\s*/).forEach(function(browserName){
        let caseName = specName + ':' + browserName;
        let browserInfo = browserName.split(' ');
        browserName = browserInfo[0];
        let browserVersion = browserInfo[1];
        describe(caseName, async function(){
            this.timeout(BASE_TIMEOUT*8);
            this.slow(1000);
            before(async function(){
                update_test_results("start");
                let self = this;
                let driver = new JWebDriver({
                    'host':host,
                    'port':port
                });
                let sessionConfig = Object.assign({},webdriverConfig,{
                    'browserName': browserName,
                    'version': browserVersion,
                    'ie.ensureCleanSession': true,
                    'chromeOptions':{'args':[ '--incognito', '--enable-automation','--disable-infobars','--disable-gpu', '--remote-debugging-port=9222']}
                });
                if (proxy) {
                    sessionConfig.proxy = {
                        'proxyType': 'manual',
                        'httpProxy': proxy,
                        'sslProxy': proxy
                    }
                } else if (hosts) {
                    sessionConfig.hosts = hosts;
                }
                self.driver = await driver.session(sessionConfig);
                self.driver.config({
                    pageloadTimeout:BASE_TIMEOUT*5,// page onload timeout
                    scriptTimeout:5000,// sync script timeout
                    asyncScriptTimeout:25000 // async script timeout
                });
                self.testVars=testVars;
                let casePath=path.dirname(caseName);
                self.screenshotPath=rootPath+'/screenshots/'+casePath;
                self.diffbasePath=rootPath+'/diffbase/'+casePath;
                self.caseName=caseName.replace(/.*\//g,'').replace(/\s*[:\.\:\-\s]\s*/g,'_');
                rootConf['caseName'] = self.caseName
                rootConf['BASE_TIMEOUT'] = BASE_TIMEOUT;
                rootConf['screenshotPath'] = self.screenshotPath;
                mkdirs(self.screenshotPath);
                mkdirs(self.diffbasePath);
                self.stepId = 0;
                var browser = self.driver;
                await browser.maximize();
                var browser_position= await browser.position();
                var browser_size= await browser.size();
                utils.info("browser_position: %s, browser_size: %s", browser_position, browser_size);
// SETUP SPEC

               for (var i in loaded_packages) {
                    let pOBJ = loaded_packages[i];
                    for (var j in pOBJ.actions) {
                        let action = pOBJ.actions[j];
                        if (!supported_actions.hasOwnProperty(action)) {
                            supported_actions[action] = [null, null, null, null, null, null, null];
                        }

                        // place package object based on priority
                        if (pOBJ.priority) {
                            if ((pOBJ.priority >= 0) && (pOBJ.priority <=6)) {
                                supported_actions[action][pOBJ.priority] = pOBJ;
                            }
                        } else {
                            supported_actions[action].push(pOBJ);
                        }
                    }
                }
                return browser;
            });
            module.exports();
            beforeEach(async function(){
                update_test_results("added");
                let self = this;
                self.stepId++;
                if(self.skipAll) {
                    self.skip();
                }
                rootConf['stepId'] = self.stepId;
            });
            afterEach(async function(){
                let self = this;
                let currentTest=self.currentTest;
                let title=currentTest.title;
                if(currentTest.state=='failed' && /^(url|waitBody|switchWindow|switchFrame):/.test(title)){
                    self.skipAll=true;
                }
                update_test_results("completed");
                if(!/^(closeWindow):/.test(title)){
                    utils.debug('afterEach: ', rootConf['current_eventid']);
                    update_test_results("update", currentTest);
                    let NoScreenshotOperations = ['keydown', 'keyup', 'direct'];
                    if (rootConf['current_action'] && (NoScreenshotOperations.indexOf(rootConf['current_action']) < 0)) {
                        let filepath = self.screenshotPath + '/' + self.caseName + '_' + self.stepId;
                        await utils.autoScreenshot(self.driver, filepath);
                        utils.info('afterEach autoScreenshot done: ', rootConf['current_eventid'], filepath);
                    }
                }
            });
            after(async function(){
// TEARDOWN SPEC
                update_test_results("end");
                return this.driver.close();
            });
        });
    });
}

function mkdirs(dirname){
    if(fs.existsSync(dirname)){
        return true;
    }else{
        if(mkdirs(path.dirname(dirname))){
            fs.mkdirSync(dirname);
            return true;
        }
    }
}

function getRootPath(){
    let rootPath=path.resolve(__dirname);
    while(rootPath){
        if(fs.existsSync(rootPath + '/config.json')){
            break;
        }
        rootPath = rootPath.substring(0, rootPath.lastIndexOf(path.sep));
    }
    return rootPath;
}

//  type: start, update, end
function update_test_results(type, currentTest=null) {
    if (type=="start") {
        // test started
        rootConf['test_results_dict'].stats.start = Date.now();
    } else if (type=="added") {
        // add test
        rootConf['test_results_dict'].stats.testsRegistered +=1;
        rootConf['test_results_dict'].stats.skipped+=1;
    } else if (type=="completed") {
        // done test
        rootConf['test_results_dict'].stats.skipped-=1;
    } else if (type=="update" && currentTest) {
        // update per test status
        rootConf['test_results_dict'].stats.tests +=1;
        if (currentTest.state=="passed") {
            rootConf['test_results_dict'].stats.passes +=1;
        } else if (currentTest.state=="failed") {
            rootConf['test_results_dict'].stats.failures +=1;
        } else if (currentTest.pending) {
            rootConf['test_results_dict'].stats.pending +=1;
        }
    } else if (type=="end") {
        // test ended
        rootConf['test_results_dict'].stats.end = Date.now();
        rootConf['test_results_dict'].stats.duration = rootConf['test_results_dict'].stats.end - rootConf['test_results_dict'].stats.start;
        rootConf['test_results_dict'].stats.start = new Date(rootConf['test_results_dict'].stats.start).toISOString();
        rootConf['test_results_dict'].stats.end = new Date(rootConf['test_results_dict'].stats.end).toISOString();
        // update soft failed
        rootConf['test_results_dict'].stats.passes -= rootConf['test_results_dict'].soft_failed;
        rootConf['test_results_dict'].stats.failures += rootConf['test_results_dict'].soft_failed;
        // caculate pass rate
        rootConf['test_results_dict'].stats.passPercent = (rootConf['test_results_dict'].stats.passes / rootConf['test_results_dict'].stats.tests *100).toFixed(1);
        // overall result
        rootConf['test_results_dict'].stats.hasSkipped = (rootConf['test_results_dict'].stats.skipped>0);
        rootConf['test_results_dict'].stats.result = (rootConf['test_results_dict'].stats.failures==0);
        saveUpdateReportFile();
    }
}

function saveUpdateReportFile(){
    var fs = require("fs");
    fs.writeFile(rootConf['test_results_file'],JSON.stringify(rootConf['test_results_dict'], null, 4),function(error){
        utils.info('Test result generated: %s', rootConf['test_results_file']);
    });
}