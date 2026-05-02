import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Product } from '../models/product.model';
import { environment } from '../../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ProductService {
    private http = inject(HttpClient);
    private readonly API = `${environment.apiUrl}/api`;

    findByBusiness(businessId: string): Observable<Product[]> {
        return this.http.get<Product[]>(`${this.API}/businesses/${businessId}/products`);
    }

    findById(businessId: string, productId: string): Observable<Product> {
        return this.http.get<Product>(`${this.API}/businesses/${businessId}/products/${productId}`);
    }

    create(businessId: string, form: FormData): Observable<Product> {
        return this.http.post<Product>(`${this.API}/businesses/${businessId}/products`, form);
    }

    update(businessId: string, productId: string, body: Partial<Product>): Observable<Product> {
        return this.http.patch<Product>(
            `${this.API}/businesses/${businessId}/products/${productId}`, body);
    }

    updateImage(businessId: string, productId: string, form: FormData): Observable<Product> {
        return this.http.put<Product>(
            `${this.API}/businesses/${businessId}/products/${productId}/image`, form);
    }

    delete(businessId: string, productId: string): Observable<void> {
        return this.http.delete<void>(
            `${this.API}/businesses/${businessId}/products/${productId}`);
    }
}
