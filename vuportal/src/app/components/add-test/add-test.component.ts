// Copyright 2022 VMware, Inc.
// SPDX-License-Identifier: Apache License 2.0

import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { Test } from 'src/app/model/test';
import { TestAPIService } from 'src/app/services/test-api.service';

@Component({
    selector: 'vuportal-add-test',
    templateUrl: './add-test.component.html',
    styleUrls: ['./add-test.component.scss']
})
export class AddTestComponent implements OnInit {
    @Output() add_test_conditioned = new EventEmitter<any>();
    userName = "";
    isAddTest = false;
    testType = "parallel";
    productList = [];
    resolutionList = [];
    vtaasLanguages = []; // cache all supported languages
    vtaasLocales = []; // cache all selected languages
    vtaasLocalesTemp = null;
    toggleAll = false;
    isValidationName = true;
    isValidationBuild = true;

    vtaasUserTest: Test = {
        id: 0,
        name: '',
        apptype: '',
        softdeleted: false,
        uuid: '',
        product: '',
        browser: 'Chrome',
        status: '',
        build: '',
        resolution: "1600x1200",
        locales: '',
        leader_locale: 'en_US',
        start_url: '',
        add_host: '',
        glossary: '',
        run_id: 0,
        user: '',
        pool: '',
        max_event_retry: 0,
        accessibility_data: '{}',
        createtime: '',
        lastruntime: '',
        access_urllist: ''
    }

    constructor(private testAPIService: TestAPIService) { }

    ngOnInit(): void {
    }

    transforInfo(obj) {
        this.userName = obj.username;
        this.productList = obj.products;
        this.resolutionList = obj.resolutions;
        this.vtaasLanguages = obj.locales;
        this.isAddTest = true;
        console.log("this.productList , ", this.productList, this.resolutionList, this.vtaasLanguages)
    }

    selectTestType(tmpType) {
        if (tmpType == "automation") {
            this.testType = "automation";

            console.log("automation", this.testType)
        } else {
            this.testType = "parallel";
            console.log("parallel", this.testType)
        }
    }

    validateName() {
        if ((this.vtaasUserTest.name).includes('/')) {
            this.isValidationName = false;
        } else {
            this.isValidationName = true;
        }
    }

    validateBuild() {
        if ((this.vtaasUserTest.build).includes('/')) {
            this.isValidationBuild = false;
        } else {
            this.isValidationBuild = true;
        }
    }

    /**
  * validate all fields
  * @method validateAllFields
  * @public
  * @return {Boolean}
 */
    validateAllFields() {
        if (this.testType == 'parallel') {
            if (!this.vtaasUserTest.name || this.vtaasUserTest.name == '' ||
                !this.vtaasUserTest.build || this.vtaasUserTest.build == '' ||
                !this.vtaasUserTest.start_url || this.vtaasUserTest.start_url == '' ||
                this.vtaasLocales.length == 0) {
                return true;
            } else {
                return false;
            }
        } else {
            if (!this.vtaasUserTest.name || this.vtaasUserTest.name == ''  ||
                !this.vtaasUserTest.start_url || this.vtaasUserTest.start_url == '') {
                return true;
            } else {
                return false;
            }
        }

    }

    /**
     * toggle all onChanges
     * @method toggleAllOnChange
     * @public
    */
    toggleAllOnChange() {
        for (let var_Locale in this.vtaasLanguages) {
            var var_checkboxSearchString = "div.clr-form-control div.clr-control-container input[id=check_lang_" + this.vtaasLanguages[var_Locale] + "]";
            var var_checkbox = <HTMLInputElement>document.querySelector(var_checkboxSearchString);
            if (var_checkbox != null) {
                var_checkbox['checked'] = this.toggleAll;
                this.updateVtaasLanguages(this.vtaasLanguages[var_Locale]);
            }
        }
    }

    /**
     * update vtaas lang
     * @method updateVtaasLanguages
     * @param {any} locale
     * @param {Boolean} isInit
     * @public
    */
    updateVtaasLanguages(locale, isInit = false) {
        let locales = this.vtaasLocales;
        if (isInit) { locales = this.vtaasLocalesTemp; }
        var var_StartUrlSearchString = "div.clr-form-control div.clr-control-container div.clr-input-wrapper input[id=inputStartURL_" + locale + "]";
        var var_StartUrl = <HTMLInputElement>document.querySelector(var_StartUrlSearchString);

        let localesWithoutStartUrl = this.GetLocalesFromTestLocales(this.vtaasLocales, true);
        let localeWithStartUrl = locale;
        if (var_StartUrl && var_StartUrl.value != "") {
            localeWithStartUrl = locale + "@" + var_StartUrl.value;
        }
        var index = localesWithoutStartUrl.indexOf(locale);

        var var_checkboxSearchString = "div.clr-form-control div.clr-control-container input[id=check_lang_" + locale + "]";
        var var_checkbox = <HTMLInputElement>document.querySelector(var_checkboxSearchString);
        if (var_checkbox && var_checkbox.checked) {
            if (index < 0) {
                this.vtaasLocales.push(localeWithStartUrl);
            } else {
                this.vtaasLocales[index] = localeWithStartUrl;
            }
        } else {
            if (index > -1) {
                this.vtaasLocales.splice(index, 1);
            }
        }
    }

    /**
     * get locales from test locales
     * @method GetLocalesFromTestLocales
     * @param {any} localesString
     * @param {Boolean} isList
     * @public
     * @return {Array} expected locales
     */
    GetLocalesFromTestLocales(localesString, isList = false) {
        let expectedLocales = [];
        let localesStringTemp = localesString;
        if (isList) { localesStringTemp = localesString.join(","); }
        let tempExpectedLocales = this.GetLocalesFromString(localesStringTemp);
        tempExpectedLocales.map(e => { expectedLocales.push(e.split('@')[0]); });
        return expectedLocales;
    }

    /**
     * get locales from string
     * @method GetLocalesFromString
     * @param {String} e
     * @public
     * @return {String} locales
     */
    GetLocalesFromString(e: String) {
        return e.replace(/\[/g, "").replace(/\]/g, "").replace(/'/g, "").replace(/ /g, "").split(",").filter(e => e !== '');
    }

    /**
     * check previous task locales
     * @method checkPreviousTaskLocales
     * @param {any} locale
     * @param {any} isInit
     * @public
    */
    checkPreviousTaskLocales(locale, isInit = false) {
        let locales = this.vtaasLocales;
        if (isInit) { locales = this.vtaasLocalesTemp; }
        let localesWithoutStartUrl = this.GetLocalesFromTestLocales(locales, true);
        let isChecked = (localesWithoutStartUrl.indexOf(locale) > -1) ? true : false;
        var var_StartUrlSearchString = "div.form-group input[id=inputStartURL_" + locale + "]";
        var var_StartUrl = <HTMLInputElement>document.querySelector(var_StartUrlSearchString);
        // if var_StartUrl.value !="", we update locales first
        let currentStartUrl = this.GetStartUrlFromTestLocales(locales, locale, true);
        if (var_StartUrl && isInit) {
            // if init, we always get value from return value, only during page init
            var_StartUrl.value = currentStartUrl;
        }
        return isChecked;
    }

    /**
     * get start url from test locales
     * @method GetStartUrlFromTestLocales
     * @param {any} localesString
     * @param {any} locale
     * @param {Boolean} isList
     * @public
     * @return {Boolean} expected start url
     */
    GetStartUrlFromTestLocales(localesString, locale, isList = false) {
        let expectedStartUrl = "";
        let localesStringTemp = localesString;
        if (isList) { localesStringTemp = localesString.join(","); }
        let tempExpectedLocales = this.GetLocalesFromString(localesStringTemp);
        tempExpectedLocales.map(e => { if (e.split('@')[0] === locale) { expectedStartUrl = (e.split('@')[1]) ? e.split('@')[1] : ""; } });
        return expectedStartUrl;
    }

    /**
     * add parallel test
     * @method addParallelTest
     * @public
    */
    addParallelTest() {
        this.isAddTest = false;

        this.vtaasUserTest.locales = this.testType == 'parallel' ? "['" + this.vtaasLocales.join("','") + "']" : "[]";
        this.vtaasUserTest.apptype = this.testType
        this.vtaasUserTest.build = this.testType == 'parallel' ? this.vtaasUserTest.build : '123';

        var objParaTest = this.vtaasUserTest;
        objParaTest.user = this.userName;

        console.log("Add Parallel Test obj", objParaTest)
        this.testAPIService.addTest(objParaTest)
            .subscribe(
                (data) => {
                    console.log("add parallel test - data", data);
                    let addedTest = data["testcase"];
                    let isSuccess = data["message"];
                    let emitObj = {
                    }
                    if(isSuccess == "success"){
                        emitObj = {
                            isSuccess: true,
                            result: addedTest
                        }
                    } else {
                        emitObj = {
                            isSuccess: false,
                            result: null
                        }
                    }
                    this.add_test_conditioned.emit(emitObj);
                    this.reset();
                },
                (error) => {
                    console.log("Failed to add test", error);
                    this.reset();
                }
            )
    }

    cancel() {
        this.isAddTest = false;
    }

    reset() {
        this.isAddTest = false;
        this.testType = "parallel";
        this.vtaasLocales = []; // cache all selected languages
        this.vtaasLocalesTemp = null;
        this.toggleAll = false;
        this.isValidationName = true;
        this.isValidationBuild = true;
        this.vtaasUserTest =  {
            id: 0,
            name: '',
            apptype: '',
            softdeleted: false,
            uuid: '',
            product: '',
            browser: 'Chrome',
            status: '',
            build: '',
            resolution: "1600x1200",
            locales: '',
            leader_locale: 'en_US',
            start_url: '',
            add_host: '',
            glossary: '',
            run_id: 0,
            user: '',
            pool: '',
            max_event_retry: 0,
            accessibility_data: '{}',
            createtime: '',
            lastruntime: '',
            access_urllist: ''
        }
    }


}
