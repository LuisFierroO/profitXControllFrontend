import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ExpenseResponse, CreateExpenseRequest, UpdateExpenseRequest, ProfitabilityResult } from '../models/expense.model';
import { environment } from '../../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ExpenseService {
    private http = inject(HttpClient);
    private readonly API = `${environment.apiUrl}/api`;

    findByBusiness(businessId: string): Observable<ExpenseResponse[]> {
        return this.http.get<ExpenseResponse[]>(
            `${this.API}/businesses/${businessId}/expenses`);
    }

    create(businessId: string, req: CreateExpenseRequest): Observable<ExpenseResponse> {
        return this.http.post<ExpenseResponse>(
            `${this.API}/businesses/${businessId}/expenses`, req);
    }

    update(businessId: string, expenseId: string, req: UpdateExpenseRequest): Observable<ExpenseResponse> {
        return this.http.put<ExpenseResponse>(
            `${this.API}/businesses/${businessId}/expenses/${expenseId}`, req);
    }

    delete(businessId: string, expenseId: string): Observable<void> {
        return this.http.delete<void>(
            `${this.API}/businesses/${businessId}/expenses/${expenseId}`);
    }

    checkProfitability(
        businessId: string,
        items: { productId: string; unitCost: number }[]
    ): Observable<ProfitabilityResult[]> {
        return this.http.post<ProfitabilityResult[]>(
            `${this.API}/businesses/${businessId}/expenses/profitability`,
            { items }
        );
    }
}
