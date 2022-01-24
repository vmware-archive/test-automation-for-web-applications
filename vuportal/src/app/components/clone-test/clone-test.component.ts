// Copyright 2022 VMware, Inc.
// SPDX-License-Identifier: Apache License 2.0

import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { Test } from 'src/app/model/test';
import { TestAPIService } from 'src/app/services/test-api.service';

@Component({
    selector: 'vuportal-clone-test',
    templateUrl: './clone-test.component.html',
    styleUrls: ['./clone-test.component.scss']
})
export class CloneTestComponent implements OnInit {
    @Output() clone_test_conditioned = new EventEmitter<any>();
    isCloneTest = false;
    testName = "";
    isValidationName = true;

    cloneTest: Test = {
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
        accessibility_data: '',
        createtime: '',
        lastruntime: '',
        access_urllist: ''
    }

    constructor(private testAPIService: TestAPIService) { }

    ngOnInit(): void {
    }

    transforInfo(obj) {
        this.cloneTest = obj.test;
        this.isCloneTest = true;
    }

    validateName() {
        if ((this.cloneTest.name).includes('/')) {
            this.isValidationName = false;
        } else {
            this.isValidationName = true;
        }
    }

    cancel() {
        this.reset();
    };

    clone() {
        console.log("Clone Parallel Test obj", this.cloneTest)
        this.testAPIService.addTest(this.cloneTest)
            .subscribe(
                (data) => {
                    console.log("clone parallel test - data", data);
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
                    this.clone_test_conditioned.emit(emitObj);
                    this.reset();
                },
                (error) => {
                    console.log("Failed to clone test", error);
                    this.reset();
                }
            )
    }

    reset() {
        this.isCloneTest = false;
        this.testName = "";
        this.isValidationName = true;

        this.cloneTest = {
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
            accessibility_data: '',
            createtime: '',
            lastruntime: '',
            access_urllist: ''
        }
    }

}
