import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { SaleResponse } from '../models/sale.model';
import { environment } from '../../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class SaleService {
    private http = inject(HttpClient);
    private readonly API = `${environment.apiUrl}/api`;

    create(businessId: string, payload: { items: { productId: string; quantity: number }[]; amountPaid?: number }): Observable<SaleResponse> {
        return this.http.post<SaleResponse>(`${this.API}/businesses/${businessId}/sales`, payload);
    }

    findByBusiness(businessId: string): Observable<SaleResponse[]> {
        return this.http.get<SaleResponse[]>(`${this.API}/businesses/${businessId}/sales`);
    }

    findById(businessId: string, saleId: string): Observable<SaleResponse> {
        return this.http.get<SaleResponse>(`${this.API}/businesses/${businessId}/sales/${saleId}`);
    }

    update(businessId: string, saleId: string,
           payload: { items: { productId: string; quantity: number }[] }): Observable<SaleResponse> {
        return this.http.patch<SaleResponse>(
            `${this.API}/businesses/${businessId}/sales/${saleId}`, payload);
    }

    delete(businessId: string, saleId: string): Observable<void> {
        return this.http.delete<void>(`${this.API}/businesses/${businessId}/sales/${saleId}`);
    }
}
