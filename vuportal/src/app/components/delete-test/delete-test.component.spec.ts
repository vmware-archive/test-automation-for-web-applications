// Copyright 2022 VMware, Inc.
// SPDX-License-Identifier: Apache License 2.0

import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DeleteTestComponent } from './delete-test.component';

describe('DeleteTestComponent', () => {
  let component: DeleteTestComponent;
  let fixture: ComponentFixture<DeleteTestComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ DeleteTestComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(DeleteTestComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
