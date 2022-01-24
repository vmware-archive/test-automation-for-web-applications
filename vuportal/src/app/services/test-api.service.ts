// Copyright 2022 VMware, Inc.
// SPDX-License-Identifier: Apache License 2.0

import { Injectable } from '@angular/core';
import { HttpClient} from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Observable } from 'rxjs';
import { Test } from '../model/test';

@Injectable()
export class TestAPIService {

    baseUrl: string = environment.testApiUrl;

    constructor(private http: HttpClient) {
    }

    public getTests(): Observable<Test[]> {
        return this.http.get<Test[]>(this.baseUrl + `/parallel/tests/`);
    }

    public addTest(test: Test): Observable<any> {
        return this.http.post<Test>(this.baseUrl + `/parallel/tests/`, test);
    }

    public deleteTest(uuid: string):Observable<any> {
        const url = `${this.baseUrl}/parallel/tests/${uuid}`;
        return this.http.delete(url)
    }

    public startTest(uuid: string):Observable<any> {
        const url = `${this.baseUrl}/parallel/tests/${uuid}` + `/start`;
        return this.http.post(url, '');
    }

    public stopTest(uuid: string):Observable<any> {
        const url =  `${this.baseUrl}/parallel/tests/${uuid}` + `/stop`;
        return this.http.post(url,'');
    }

    public getTest(uuid: string): Observable<Test> {
        return this.http.get<Test>(this.baseUrl + `/parallel/tests/` + uuid);
    }

    public getTestReport(id: string):  Observable<any> {
        return this.http.get<Test>(this.baseUrl + `/parallel/tests/` + id + `/report`);
    }

    public getResolutions(): Observable<any> {
        return this.http.get<Test>(this.baseUrl + `/parallel/resolutions/` );
    }

    public getLocales(): Observable<any> {
        return this.http.get<Test>(this.baseUrl + `/parallel/locales/` );
    }

    public getProducts(): Observable<any> {
        return this.http.get<Test>(this.baseUrl + `/parallel/products/` );
    }
}


