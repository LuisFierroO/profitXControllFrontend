import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { BusinessResponse } from '../models/business.model';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class BusinessService {
    private http = inject(HttpClient);
    private readonly API = `${environment.apiUrl}/api`;

    getMyBusinesses(): Observable<BusinessResponse[]> {
        return this.http.get<BusinessResponse[]>(`${this.API}/businesses`);
    }

    getById(businessId: string): Observable<BusinessResponse> {
        return this.http.get<BusinessResponse>(`${this.API}/businesses/${businessId}`);
    }

    create(form: FormData): Observable<BusinessResponse> {
        return this.http.post<BusinessResponse>(`${this.API}/businesses`, form);
    }

    update(businessId: string, body: { name?: string; description?: string }): Observable<BusinessResponse> {
        return this.http.patch<BusinessResponse>(`${this.API}/businesses/${businessId}`, body);
    }

    updateImage(businessId: string, form: FormData): Observable<BusinessResponse> {
        return this.http.put<BusinessResponse>(`${this.API}/businesses/${businessId}/image`, form);
    }

    delete(businessId: string): Observable<void> {
        return this.http.delete<void>(`${this.API}/businesses/${businessId}`);
    }
}
