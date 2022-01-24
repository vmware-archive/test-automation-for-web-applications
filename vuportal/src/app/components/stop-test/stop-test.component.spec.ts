// Copyright 2022 VMware, Inc.
// SPDX-License-Identifier: Apache License 2.0

import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StopTestComponent } from './stop-test.component';

describe('StopTestComponent', () => {
  let component: StopTestComponent;
  let fixture: ComponentFixture<StopTestComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ StopTestComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(StopTestComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
