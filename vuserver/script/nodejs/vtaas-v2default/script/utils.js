const fs=require('fs');
require('log-timestamp');

const L_DEBUG = 3;
const L_INFO = 2;
const L_WARN = 1;
const L_ERR = 0;
var g_level = L_DEBUG;

function getTimestamp()
{
    var now = new Date();
    var y = now.getFullYear();
    var m = now.getMonth() + 1;
    var d = now.getDate();
    var hour = now.getHours();
    var min = now.getMinutes();
    var sec = now.getSeconds();
    var msec = now.getMilliseconds();
    return "[" + y + "-" + (m < 10 ? "0" + m : m) +
            "-" + (d < 10 ? "0" + d : d) +
            " " + (hour < 10 ? "0" + hour : hour) +
            ":" + (min < 10 ? "0" + min : min) +
            ":" + (sec < 10 ? "0" + sec : sec) +
            "." + (msec < 100 ? (msec < 10 ? "00" + msec : '0' + msec) : msec) + "] ";
}

function print(fmt, ...extras)
{
    console.log(fmt, ...extras);
}

function setlevel(level)
{
    g_level = level;
}

function debug(fmt, ...extras)
{
    if (g_level >= L_DEBUG)
    {
        console.log(fmt, ...extras);
    }
}

function info(fmt, ...extras)
{
    if (g_level >= L_INFO)
    {
        console.log(fmt, ...extras);
    }
}

function warn(fmt, ...extras)
{
    if (g_level >= L_WARN)
    {
        console.log(fmt, ...extras);
    }
}

function error(fmt, ...extras)
{
    if (g_level >= L_ERR)
    {
        console.log(fmt, ...extras);
    }
}

async function userSleep(sleep_time = 1){
    return await new Promise((resolve,reject)=>{
        setTimeout(()=>{
            resolve();
        }, sleep_time);
    });
}

// wait eachsleep for every call
// return left miliseconds
// refresh page each 15 minutes to avoid session timeout
async function smartWait(driver, starttime, totalwait, eachsleep=30000) {
    let time_elapsed = Date.now() - starttime;
    if (time_elapsed > totalwait) {
        return 0;
    }

    let current_sleep_time = eachsleep;
    if((totalwait - time_elapsed) < current_sleep_time){
        current_sleep_time = totalwait - time_elapsed;
    }
    debug('smartWait starts: %s, %s/%s.', current_sleep_time, time_elapsed, totalwait);
    await driver.mouseMove('//div', 0, 0);
    debug('current_sleep_time: ', current_sleep_time);
    await userSleep(current_sleep_time);
    await driver.mouseMove('//div', 1, 1);

    let current_waited = time_elapsed + current_sleep_time;
    let left_wait = totalwait - current_waited;
    // refresh each 15 minutes
    if (eachsleep >= 900000) {
        debug('refresh page: %s/%s.', current_waited, totalwait);
        await driver.refresh();
    } else {
        if ((current_waited % 900000) < current_sleep_time) {
            debug('refresh page: %s/%s.', current_waited, totalwait);
            await driver.refresh();
        }
    }
    return left_wait;
}

async function autoScreenshot(driver, filepath) {
    // debug('autoScreenshot, running: ', filepath);
    if (fs.existsSync(filepath + '.png')) {
        debug('autoScreenshot skipped: ', filepath);
    } else {
        try{
            await takeScreenshot(driver, filepath, {areaType: 'screen'});
        } catch(e) {
            debug('--> autoScreenshot failed');
        }
    }
}

async function takeScreenshot(driver, filepath, screenshotInfo){
    await waitPageLoadComplete(driver);
    let screenshot_name = filepath+'.png';

    debug('takeScreenshot: ', screenshot_name, screenshotInfo);
    let screenshot;
    if (screenshotInfo.areaType === 'fullpage') {
        screenshot = await getFullPageScreenshot(driver);
    } else {
        screenshot= await driver.getScreenshot();
        if (screenshotInfo.areaType === 'element') {
            let screenshotBuffer = Buffer.from(screenshot, 'base64');
            screenshot = await Jimp.read(screenshotBuffer).then(image => {
                return image.crop(
                        screenshotInfo.elementRect.x,
                        screenshotInfo.elementRect.y,
                        screenshotInfo.elementRect.width,
                        screenshotInfo.elementRect.height
                ).getBase64Async(Jimp.MIME_PNG);
            }).catch(err => {
                debug('Take element screenshot failed.', err);
                return null;
            });
            if (screenshot == null) {
                return null;
            }
            const dataUrlHeader = 'data:image/png;base64,';
            if (screenshot.length > dataUrlHeader.length) {
                screenshot = screenshot.substring(dataUrlHeader.length);
            }
        }
    }
    const fs=require("fs");
    fs.writeFileSync(screenshot_name,Buffer.from(screenshot, 'base64'));
    return screenshot;
}

async function waitPageLoadComplete(driver){
    const func='return document.readyState;';
    let errorCount=0;
    while (true){
        let evalError,evalStatus;
        await driver.sleep(1000).eval(func,function(error,status){
            evalError=error;
            evalStatus=status;
        });
        debug('Page load', evalError, 'status', evalStatus);
        if((evalStatus=='complete')||( evalStatus=='loaded')){
            break;
        }else{
            errorCount++;
            if (errorCount > 120){
                error('Failed to wait for page loaded:' + evalError);
                break;
            }
        }
    }
}

async function getFullPageScreenshot(driver) {
    const CDP = require('chrome-remote-interface');

    async function getWindowInnerSize() {
        let size = await driver.sleep(200).eval('return {innerWidth: window.innerWidth, innerHeight: window.innerHeight}');
        return size;
    }

    async function getHeights() {
        return await driver.sleep(200).eval('return {clientHeight: document.documentElement.clientHeight, scrollTop: document.documentElement.scrollTop, scrollHeight: document.body.scrollHeight}');
    }

    let allHeights = await getHeights();
    let script_template = 'return window.scrollTo(0, document.body.scrollHeight);';
    if (allHeights.scrollHeight > allHeights.clientHeight) {
        let currentTop = 0;
        let maxTop = allHeights.scrollHeight - allHeights.clientHeight;
        while(true) {
            script = script_template.replace('document.body.scrollHeight', String(currentTop));
            await driver.sleep(200).eval(script, function(error, result){
                info('Scroll to ', currentTop, error);
            });
            currentTop = currentTop + allHeights.clientHeight;
            if (currentTop >= allHeights.scrollHeight) {
                // scroll back to original position
                script = script_template.replace('document.body.scrollHeight', String(allHeights.scrollTop));
                await driver.sleep(200).eval(script, function(error, result){
                    info('Scroll to ', allHeights.scrollTop, error);
                });
                break;
            } else {
                if (currentTop > maxTop) {
                    currentTop = maxTop;
                }
            }
        }
    }

    let windowInnerSize = await getWindowInnerSize();
    let pageTargetId;
    let targets = await CDP.List();
    for (const t of targets) {
        if (t.type === 'page') {
            pageTargetId = t.id;
            break;
        }
    }
    let client;
    try {
        // connect to endpoint
        client = await CDP({target: pageTargetId});
        const {Emulation, Page} = client;
        let layoutMetrics = await Page.getLayoutMetrics();
        await Emulation.setDeviceMetricsOverride({
                mobile: false,
                width: layoutMetrics.contentSize.width,
                height: layoutMetrics.contentSize.height,
                deviceScaleFactor: 0,
        });
        let screenshot = await Page.captureScreenshot({
                format: "png",
                clip: {
                    x: 0,
                    y: 0,
                    width: layoutMetrics.contentSize.width,
                    height: layoutMetrics.contentSize.height,
                    scale: 1
                },
        });
        //let imageData = 'data:image/png;base64,' + screenshot.data;
        await Emulation.setDeviceMetricsOverride({
                mobile: false,
                width: windowInnerSize.innerWidth,
                height: windowInnerSize.innerHeight,
                deviceScaleFactor: 0,
        });
        return screenshot.data;
    } catch (err) {
        error(err);
    } finally {
        if (client) {
            await client.close();
        }
    }
}

module.exports = {
    print,
    setlevel,
    debug,
    info,
    warn,
    error,
    smartWait,
    autoScreenshot,
    takeScreenshot
}
