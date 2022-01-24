// Copyright 2022 VMware, Inc.
// SPDX-License-Identifier: Apache License 2.0

import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { Test } from 'src/app/model/test';
import { TestAPIService } from 'src/app/services/test-api.service';

@Component({
    selector: 'vuportal-delete-test',
    templateUrl: './delete-test.component.html',
    styleUrls: ['./delete-test.component.scss']
})
export class DeleteTestComponent implements OnInit {
    @Output() delete_test_conditioned = new EventEmitter<any>();
    isDeleteTest = false;
    test: Test = {
        id: 0,
        name: '',
        apptype: '',
        softdeleted: false,
        uuid: '',
        product: '',
        browser: '',
        status: '',
        build: '',
        resolution: '',
        locales: '',
        leader_locale: '',
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
    };
    constructor(private testAPIService: TestAPIService) { }

    ngOnInit(): void {
    }

    transforInfo(obj) {
        this.test = obj.test;
        console.log("delete test uuid ", this.test)
        this.isDeleteTest = true;
    }

    cancel(){
        this.reset();
    }

    delete(){
        this.isDeleteTest = false;
        this.testAPIService.deleteTest(this.test.uuid)
        .subscribe(
            (data) => {
                console.log("delete - data", data);
                let isSuccess = data["message"];
                let emitObj = {
                }
                if(isSuccess == "success"){
                    emitObj = {
                        isSuccess: true,
                        result: this.test
                    }
                } else {
                    emitObj = {
                        isSuccess: false,
                        result: null
                    }
                }
                this.reset();
                this.delete_test_conditioned.emit(emitObj);
            },
            (error) => {
                console.log("Failed to delete test", error);
                this.reset();
            }
        )
    }

    reset(){
        this.isDeleteTest = false;
    }

}
