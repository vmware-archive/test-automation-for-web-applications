// Copyright 2022 VMware, Inc.
// SPDX-License-Identifier: Apache License 2.0

import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'vuportal-alert',
  templateUrl: './alert.component.html',
  styleUrls: ['./alert.component.scss']
})
export class AlertComponent implements OnInit {

  alertMessage;
  isDanger = false;
  isWarning = false;
  isInfo = false;
  isSuccess = false;

  constructor() { }
  
  /**
   * nitalize component and print some logs
   * @method ngOnInit
   * @public
   */ 
  ngOnInit() {
    console.log("init alter component!")
    // this.resetActionStatus();
  }

  /**
   * Set alert level
   * @method alertActions
   * @param message 
   * @param alterActions 
   * @public 
   */
  public alertActions(message: string, alterActions: string) {
    this.alertMessage = message;
    if (alterActions.indexOf("success") >= 0) {
      console.log( "alter component success!")
      this.resetActionStatus();
      this.isSuccess = true;
    } else if (alterActions.indexOf("info") >= 0) {
      this.resetActionStatus();
      this.isInfo = true;
    } else if (alterActions.indexOf("danger") >= 0) {
      this.resetActionStatus();
      this.isDanger = true;
    } else if (alterActions.indexOf("warning") >= 0) {
      this.resetActionStatus();
      this.isWarning = true;
    } else {
      console.log("Please make sure the alertAction belong to (danger , warning, success, info)");
      this.resetActionStatus();
    }
  }
  
  /**
   * reset action status
   * @method resetActionStatus
   * @public
   */
  resetActionStatus() {
    this.isSuccess = false;
    this.isDanger = false;
    this.isInfo = false;
    this.isWarning = false;
  }


}
