// Copyright 2022 VMware, Inc.
// SPDX-License-Identifier: Apache License 2.0

import { Component } from '@angular/core';

@Component({
  selector: 'vuportal-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  title = 'vuportal';
  public userName: string = null;
}
