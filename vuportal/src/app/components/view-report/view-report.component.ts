// Copyright 2022 VMware, Inc.
// SPDX-License-Identifier: Apache License 2.0

import { Component, OnInit, ViewChild } from '@angular/core';
import { TestAPIService } from 'src/app/services/test-api.service';
import { AlertComponent } from '../alert/alert.component';

@Component({
    selector: 'vuportal-view-report',
    templateUrl: './view-report.component.html',
    styleUrls: ['./view-report.component.scss']
})
export class ViewReportComponent implements OnInit {
    @ViewChild(AlertComponent) alertComponent: AlertComponent;
    isOpenReportDialog = false;
    loadingReportFlag = false;
    testReportList: any[] = [];
    testID: number = 0;
    testName = "";

    constructor(private testAPIService: TestAPIService) { }

    ngOnInit(): void {
    }

    transforInfo(obj) {
        this.testID = obj.test.id;
        this.testName = obj.test.name;
        console.log("test info", obj.test)
        this.isOpenReportDialog = true;
        this.getReport();
    }

    getReport() {
        this.loadingReportFlag = true;
        this.testReportList = [];
        this.alertComponent.resetActionStatus();
        this.testAPIService.getTestReport(String(this.testID))
            .subscribe(
                (data) => {
                    console.log("get test report - data", data);
                    
                    let testRunInfo = data["testruns"];
                    let isSuccess = data["message"];
                    if (isSuccess == "success") {
                        this.loadingReportFlag = false;
                        if (Object.keys(testRunInfo).length > 0) {
                            for (let key in testRunInfo) {
                                this.testReportList.push({
                                    testName: this.testName,
                                    runId: key,
                                    screenshots: testRunInfo[key].captures,
                                    script: testRunInfo[key].script,
                                    events: testRunInfo[key].events,
                                    recordDate: testRunInfo[key].record_time
                                });
                            }
                        } else {
                            this.testReportList = [];
                            this.alertComponent.alertActions("No report!", "warning");
                        }
                    }
                },
                (error) => {
                    console.log("Failed to get test report", error);
                }
            )
    }

    close() {
        this.reset();
    }

    reset() {
        this.isOpenReportDialog = false;
        this.loadingReportFlag = false;
        this.testReportList = [];
        this.testID = 0;
        this.testName = "";
    }

}
