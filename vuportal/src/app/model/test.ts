// Copyright 2022 VMware, Inc.
// SPDX-License-Identifier: Apache License 2.0

export interface Test {
    id: number,
    name: string,
    apptype: string,
    softdeleted: boolean,
    uuid: string,
    product: string,
    browser: string,
    status: string,
    build: string,
    resolution: string,
    locales: string,
    leader_locale: string,
    start_url: string,
    add_host: string,
    glossary: string,
    run_id: number,
    user: string,
    pool: string,
    max_event_retry: number,
    accessibility_data: string,
    createtime: string,
    lastruntime: string,
    access_urllist: string
  }