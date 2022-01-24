// Copyright 2022 VMware, Inc.
// SPDX-License-Identifier: Apache License 2.0

import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { HomeComponent } from './components/home/home.component';
import { ManagementComponent } from './components/management/management.component';

const routes: Routes = [

  {path: 'home', component: HomeComponent},
  {path: 'recording', component: ManagementComponent},
  {path: '', redirectTo: 'home', pathMatch: 'full'},
  { path: '**', redirectTo: 'home' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
