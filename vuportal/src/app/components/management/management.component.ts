// Copyright 2022 VMware, Inc.
// SPDX-License-Identifier: Apache License 2.0

import { Component, OnInit, ViewChild } from '@angular/core';
import { Test } from 'src/app/model/test';
import { TestAPIService } from 'src/app/services/test-api.service';
import { environment } from 'src/environments/environment';
import { AddTestComponent } from '../add-clone-test/add-clone-test.component';
import { AlertComponent } from '../alert/alert.component';
import { CloneTestComponent } from '../clone-test/clone-test.component';
import { DeleteTestComponent } from '../delete-test/delete-test.component';
import { StartTestComponent } from '../start-test/start-test.component';
import { StopTestComponent } from '../stop-test/stop-test.component';
import { ViewReportComponent } from '../view-report/view-report.component';


@Component({
    selector: 'vuportal-management',
    templateUrl: './management.component.html',
    styleUrls: ['./management.component.scss']
})
export class ManagementComponent implements OnInit {
    @ViewChild(AlertComponent) alertComponent: AlertComponent;
    @ViewChild(AddTestComponent) addTestComponent: AddTestComponent;
    @ViewChild(DeleteTestComponent) deleteTestComponent: DeleteTestComponent;
    @ViewChild(StartTestComponent) startTestComponent: StartTestComponent;
    @ViewChild(StopTestComponent) stopTestComponent: StopTestComponent;
    @ViewChild(CloneTestComponent) cloneTestComponent: CloneTestComponent;
    @ViewChild(ViewReportComponent) viewReportComponent: ViewReportComponent;

    // userName: string = environment.defaultUser;
    userName: string = "";
    localeList: string [] = [];
    resolutionList: string [] = [];
    productList: string [] = [];
    loading = false;
    selectedTests: Test[] = [];
    testList: Test[] = [];
    liveConsoleBase: string = environment.testApiUrl;

    constructor(private testAPIService: TestAPIService) { }

    ngOnInit(): void {
        this.userName = localStorage.getItem("user");
        console.log("username is ", this.userName)
        this.getLocales();
        this.getProducts();
        this.getResolutions();
        this.getTests();
    }

    getLocales(){
        this.testAPIService.getLocales()
            .subscribe(
                (data) => {
                    this.localeList = data["locales"];
                    console.log("this.localeList", this.localeList)
                },
                (error) => {
                    console.log("Failed to get locale list", error)
                }
            )
    }

    getProducts(){
        this.testAPIService.getProducts()
            .subscribe(
                (data) => {
                    let tmpProducts: any [] = data["products"]
                    this.productList = tmpProducts.map(e=>{
                        return e.name
                    });
                    console.log("this.productList", this.productList)
                },
                (error) => {
                    console.log("Failed to get product list", error)
                }
            )
    }

    getResolutions(){
        this.testAPIService.getResolutions()
            .subscribe(
                (data) => {
                    this.resolutionList = data["resolutions"];
                    console.log("this.resolutionList", this.resolutionList)
                },
                (error) => {
                    console.log("Failed to get resolution list", error)
                }
            )
    }

    getTests() {
        this.loading = true;
        this.testAPIService.getTests()
            .subscribe(
                (data) => {
                    this.loading = false;
                    // this.testList = data["tests"];
                    let dataMessage = data["message"];
                    if(dataMessage === "success"){
                        this.testList = data["tests"];
                        console.log("this.testList", this.testList)
                    } else {
                        console.log("no test", this.testList)
                    }
                },
                (error) => {
                    this.loading = false;
                    console.log("Failed to get test list", error)
                }
            )
    }

    addCloneViewTest(isAdded) {
        let obj = {
            username: this.userName,
            products: this.productList,
            locales: this.localeList,
            resolutions: this.resolutionList
        }
        setTimeout(() => {
            this.addTestComponent.transforInfo(obj, isAdded, this.selectedTests[0]);
        },500) 
    }

    addedTest(event) {
        console.log("added event", event);
        let isSuccess = event.isSuccess;
        if (isSuccess) {
            let addedTest: Test = event.result
            this.alertComponent.alertActions("Add test " + addedTest.name + " successfully!", "success");
            this.testList.unshift(addedTest)
        } else {
            this.alertComponent.alertActions("Fail to add test!", "danger");
        }
    }

    viewClonedTest(event) {
        console.log("cloned event", event);
        let isSuccess = event.isSuccess;
        if (isSuccess) {
            let clonedTest: Test = event.result
            this.alertComponent.alertActions("Cloned test " + clonedTest.name + " successfully!", "success");
            this.testList.unshift(clonedTest)
        } else {
            this.alertComponent.alertActions("Fail to clone test!", "danger");
        }
    }

    deleteTest(test: Test) {
        let obj = {
            test: test
        }
        this.deleteTestComponent.transforInfo(obj);
    }

    deletedTest(event) {
        console.log("deleted event", event);
        let isSuccess = event.isSuccess;
        if (isSuccess) {
            let deletedTest: Test = event.result
            this.alertComponent.alertActions("Delete test " + deletedTest.name + " successfully!", "success");
            this.getTests();
        } else {
            this.alertComponent.alertActions("Fail to delete test!", "danger");
        }
    }

    startTest(test: Test) {
        let obj = {
            testUUID: test.uuid
        }
        this.startTestComponent.transforInfo(obj);
    }

    startedTest(event) {
        console.log("start test event", event);
        let isSuccess = event.isSuccess;

        if (isSuccess) {
            let startTest: Test = event.result
            this.alertComponent.alertActions("Start test " + startTest.name + " successfully!", "success");
            // this.getTests();
            this.testList = this.testList.map(e => {
                if (e.id === startTest.id) {
                    e = startTest
                }
                return e;
            });
            this.selectedTests.push(startTest);

            // If start test successfully anf the test is running, and then open the console to recording
            let testUUID = startTest.uuid;
            this.testAPIService.getTest(testUUID)
                .subscribe(
                    (data) => {
                        console.log("get test console information - data", data);
                        let isSuccess = data["message"];
                        let testcase = data["testcase"];
                        let consoles:any []= data["consoles"];
                        console.log("console info", consoles)
                        if (isSuccess) {
                            if(consoles.length > 1) {
                                let leaderConsole = consoles.filter(el => { return el.role === "leader"; })[0];
                                console.log("leader console info", leaderConsole)
                                // let port = leaderConsole.vnc_port + leaderConsole.index + 1;
                                let leaderUrl = leaderConsole.vnc_protocol + "://" + leaderConsole.vnc_host + ":" + String(leaderConsole.vnc_port) + "/?password=vncpassword&view_only=false";
                                console.log("open window to recording - ", leaderUrl)
                                let newWindow1 = window.open(this.liveConsoleBase + '/parallel/live/' + testcase.uuid, testcase.uuid);
                                let newWindow2 = window.open(leaderUrl, leaderUrl);
                            } else if(consoles.length == 1){
                                let leaderConsole = consoles.filter(el => { return el.role === "leader"; })[0];
                                let leaderUrl = leaderConsole.vnc_protocol + "://" + leaderConsole.vnc_host + ":" + String(leaderConsole.vnc_port) + "/?password=vncpassword&view_only=false";
                                let newWindow1 = window.open(leaderUrl, leaderUrl);
                            } else {
                                this.alertComponent.alertActions("Can't open the consoles, the test is not running!", "danger");
                            }
                        }
                    },
                    (error) => {
                        console.log("Failed to get start test", error);
                    }
                )
        } else {
            this.alertComponent.alertActions("Fail to start test!", "danger");
        }

    }

    stopTest(test: Test) {
        let obj = {
            testUUID: test.uuid
        }
        this.stopTestComponent.transforInfo(obj);
    }

    stopedTest(event) {
        console.log("stop test event", event);
        let isSuccess = event.isSuccess;

        if (isSuccess) {
            let stopTest: Test = event.result
            this.alertComponent.alertActions("Stop test : " + stopTest.name + " successfully!", "success");
            this.testList = this.testList.map(e => {
                if (e.id === stopTest.id) {
                    e = stopTest
                }
                return e;
            });
            this.selectedTests.push(stopTest);
        } else {
            this.alertComponent.alertActions("Fail to stop test!", "danger");
        }
    }

    cloneTest(test: Test) {
        let obj = {
            test: test
        }
        this.cloneTestComponent.transforInfo(obj)
     }

    clonedTest(event){
        console.log("clone event", event);
        let isSuccess = event.isSuccess;
        if (isSuccess) {
            let tmpTest: Test = event.result
            this.alertComponent.alertActions("Clone test " + tmpTest.name + " successfully!", "success");
            // this.testList.unshift(tmpTest)
            this.getTests();
        } else {
            this.alertComponent.alertActions("Fail to clone test!", "danger");
        }
    }

    viewReport(test: Test) {
        let obj = {
            test: test
        }
        this.viewReportComponent.transforInfo(obj);
    }

    openConsoles(test: Test) {
        // get test info and then open consoles
        this.testAPIService.getTest(test.uuid)
        .subscribe(
            (data) => {
                console.log("get test console information - data", data);
                let isSuccess = data["message"];
                let testcase = data["testcase"];
                let consoles:any []= data["consoles"];
                console.log("console info", consoles)
                if (isSuccess) {
                    if(consoles.length > 1) {
                        let leaderConsole = consoles.filter(el => { return el.role === "leader"; })[0];
                        console.log("leader console info", leaderConsole)
                        // let port = leaderConsole.vnc_port + leaderConsole.index + 1;
                        let leaderUrl = leaderConsole.vnc_protocol + "://" + leaderConsole.vnc_host + ":" + String(leaderConsole.vnc_port) + "/?password=vncpassword&view_only=false";
                        console.log("open window to recording - ", leaderUrl)
                        let newWindow1 = window.open(this.liveConsoleBase + '/parallel/live/' + testcase.uuid, testcase.uuid);
                        let newWindow2 = window.open(leaderUrl, leaderUrl);
                    } else if(consoles.length == 1){
                        let leaderConsole = consoles.filter(el => { return el.role === "leader"; })[0];
                        let leaderUrl = leaderConsole.vnc_protocol + "://" + leaderConsole.vnc_host + ":" + String(leaderConsole.vnc_port) + "/?password=vncpassword&view_only=false";
                        let newWindow1 = window.open(leaderUrl, leaderUrl);
                    } else {
                        this.alertComponent.alertActions("Can't open the consoles, the test is not running!", "danger");
                    }
                }
            },
            (error) => {
                console.log("Failed to get start test", error);
            }
        )
     }

    refresh() {
        this.getTests();
    }
}
