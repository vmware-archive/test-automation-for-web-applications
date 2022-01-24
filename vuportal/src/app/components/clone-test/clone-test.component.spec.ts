// Copyright 2022 VMware, Inc.
// SPDX-License-Identifier: Apache License 2.0

import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CloneTestComponent } from './clone-test.component';

describe('CloneTestComponent', () => {
  let component: CloneTestComponent;
  let fixture: ComponentFixture<CloneTestComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CloneTestComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(CloneTestComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
