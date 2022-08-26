// Copyright 2022 VMware, Inc.
// SPDX-License-Identifier: Apache License 2.0

import { Component, OnInit } from '@angular/core';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'vuportal-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent  implements OnInit {
  title = 'vuportal';
  public userName: string = null;
  ngOnInit(): void {
    this.userName = localStorage.getItem("user");
    if(this.userName === null || this.userName === ""){
      localStorage.setItem("user", environment.defaultUser);
    }
  }
}