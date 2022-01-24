// Copyright 2022 VMware, Inc.
// SPDX-License-Identifier: Apache License 2.0

import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'vuportal-navigation',
  templateUrl: './navigation.component.html',
  styleUrls: ['./navigation.component.scss']
})
export class NavigationComponent implements OnInit {
  collapsed =  true;
  constructor() { }

  ngOnInit(): void {
  }

}
