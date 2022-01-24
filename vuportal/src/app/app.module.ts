// Copyright 2022 VMware, Inc.
// SPDX-License-Identifier: Apache License 2.0

import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { ClarityModule } from '@clr/angular';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { ManagementComponent } from './components/management/management.component';
import { NavigationComponent } from './components/navigation/navigation.component';
import { FooterComponent } from './components/footer/footer.component';
import { HomeComponent } from './components/home/home.component';
import { TestAPIService } from './services/test-api.service';
import { HttpClientModule } from '@angular/common/http';
import { AddTestComponent } from './components/add-test/add-test.component';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { AlertComponent } from './components/alert/alert.component';
import { DeleteTestComponent } from './components/delete-test/delete-test.component';
import { StartTestComponent } from './components/start-test/start-test.component';
import { StopTestComponent } from './components/stop-test/stop-test.component';
import { CloneTestComponent } from './components/clone-test/clone-test.component';
import { ViewReportComponent } from './components/view-report/view-report.component';

@NgModule({
  declarations: [
    AppComponent,
    ManagementComponent,
    FooterComponent,
    HomeComponent,
    NavigationComponent,
    AddTestComponent,
    AlertComponent,
    DeleteTestComponent,
    StartTestComponent,
    StopTestComponent,
    CloneTestComponent,
    ViewReportComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    FormsModule,
    ReactiveFormsModule,
    ClarityModule,
    BrowserAnimationsModule,
    HttpClientModule
  ],
  providers: [TestAPIService],
  bootstrap: [AppComponent]
})
export class AppModule { }
