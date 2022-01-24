// Copyright 2022 VMware, Inc.
// SPDX-License-Identifier: Apache License 2.0

import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { TestAPIService } from 'src/app/services/test-api.service';
import { environment } from 'src/environments/environment';

@Component({
    selector: 'vuportal-start-test',
    templateUrl: './start-test.component.html',
    styleUrls: ['./start-test.component.scss']
})
export class StartTestComponent implements OnInit {
    @Output() start_test_conditioned = new EventEmitter<any>();
    isStartTest = false;
    testUUID = "";
    baseUrl: string = environment.testApiUrl;
    constructor(private testAPIService: TestAPIService) { }

    ngOnInit(): void {
    }

    transforInfo(obj) {
        this.testUUID = obj.testUUID
        console.log("start test uuid ", this.testUUID)
        this.isStartTest = true;
    }

    cancel() {
        this.reset();
    }

    start() {
        this.isStartTest = false;
        let emitObj = {
        };
        this.testAPIService.startTest(this.testUUID)
        .subscribe(
            (data) => {
                console.log("start - data", data);
                let isSuccess = data["message"];
                let testcase = data["testcase"];
                let consoles = data["consoles"];

                if(isSuccess == "success"){
                    emitObj = {
                        isSuccess: true,
                        result: testcase,
                        consoles: consoles
                    }
                        
                } else {
                    emitObj = {
                        isSuccess: false,
                        result: null,
                        consoles: null
                    }
                }
                this.reset();
                this.start_test_conditioned.emit(emitObj);
            },
            (error) => {
                console.log("Failed to start test", error);
                this.reset();
            }
        )
        this.reset();
    }

   

    reset() {
        this.isStartTest = false;
        this.testUUID = "";
    }

}
