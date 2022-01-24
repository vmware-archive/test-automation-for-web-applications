// Copyright 2022 VMware, Inc.
// SPDX-License-Identifier: Apache License 2.0

import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { TestAPIService } from 'src/app/services/test-api.service';

@Component({
    selector: 'vuportal-stop-test',
    templateUrl: './stop-test.component.html',
    styleUrls: ['./stop-test.component.scss']
})
export class StopTestComponent implements OnInit {
    @Output() stop_test_conditioned = new EventEmitter<any>();
    isStopTest = false;
    testUUID = "";
    constructor(private testAPIService: TestAPIService) { }

    ngOnInit(): void {
    }

    transforInfo(obj) {
        this.testUUID = obj.testUUID
        console.log("stop test uuid ", this.testUUID)
        this.isStopTest = true;
    }

    stop(){
        this.isStopTest = false;
        let emitObj = {
        };
        this.testAPIService.stopTest(this.testUUID)
        .subscribe(
            (data) => {
                console.log("stop - data", data);
                let isSuccess = data["message"];
                let testcase = data["testcase"];

                if(isSuccess == "success"){
                    emitObj = {
                        isSuccess: true,
                        result: testcase
                    }
                        
                } else {
                    emitObj = {
                        isSuccess: false,
                        result: null
                    }
                }
                this.reset();
                this.stop_test_conditioned.emit(emitObj);
            },
            (error) => {
                console.log("Failed to stop test", error);
                this.reset();
            }
        )
        this.reset();
    }

    cancel(){
        this.reset();
    }

    reset() {
        this.isStopTest = false;
        this.testUUID = ""
    }

}
