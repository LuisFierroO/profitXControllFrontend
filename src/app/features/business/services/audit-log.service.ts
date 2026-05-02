import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuditLogPage } from '../models/audit-log.model';
import { environment } from '../../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class AuditLogService {
    private http = inject(HttpClient);
    private readonly API = `${environment.apiUrl}/api`;

    findByBusiness(businessId: string, page = 0, size = 50): Observable<AuditLogPage> {
        const params = new HttpParams().set('page', page).set('size', size);
        return this.http.get<AuditLogPage>(
            `${this.API}/businesses/${businessId}/audit`, { params });
    }
}
