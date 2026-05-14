import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Summary, TimeSeriesPoint, TopProduct, ExpenseBreakdown, StockAlert, PriceTypeProfit } from '../models/metrics.model';
import { environment } from '../../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class MetricsService {
    private http = inject(HttpClient);
    private readonly API = `${environment.apiUrl}/api`;

    getSummary(businessId: string, from?: Date, to?: Date): Observable<Summary> {
        let params = new HttpParams();
        if (from) params = params.set('from', from.toISOString());
        if (to)   params = params.set('to', to.toISOString());
        return this.http.get<Summary>(
            `${this.API}/businesses/${businessId}/metrics/summary`, { params });
    }

    getTimeSeries(businessId: string, from?: Date, to?: Date): Observable<TimeSeriesPoint[]> {
        let params = new HttpParams();
        if (from) params = params.set('from', from.toISOString());
        if (to)   params = params.set('to', to.toISOString());
        return this.http.get<TimeSeriesPoint[]>(
            `${this.API}/businesses/${businessId}/metrics/timeseries`, { params });
    }

    getTopProducts(businessId: string, from?: Date, to?: Date,
                   limit = 5, sortBy: 'quantity' | 'revenue' = 'quantity'): Observable<TopProduct[]> {
        let params = new HttpParams()
            .set('limit', limit.toString())
            .set('sortBy', sortBy);
        if (from) params = params.set('from', from.toISOString());
        if (to)   params = params.set('to', to.toISOString());
        return this.http.get<TopProduct[]>(
            `${this.API}/businesses/${businessId}/metrics/top-products`, { params });
    }

    getExpenseBreakdown(businessId: string, from?: Date, to?: Date): Observable<ExpenseBreakdown[]> {
        let params = new HttpParams();
        if (from) params = params.set('from', from.toISOString());
        if (to)   params = params.set('to', to.toISOString());
        return this.http.get<ExpenseBreakdown[]>(
            `${this.API}/businesses/${businessId}/metrics/expense-breakdown`, { params });
    }

    getStockAlerts(businessId: string): Observable<StockAlert[]> {
        return this.http.get<StockAlert[]>(
            `${this.API}/businesses/${businessId}/metrics/stock-alerts`);
    }

    getProfitByPriceType(businessId: string, from?: Date, to?: Date): Observable<PriceTypeProfit[]> {
        let params = new HttpParams();
        if (from) params = params.set('from', from.toISOString());
        if (to)   params = params.set('to', to.toISOString());
        return this.http.get<PriceTypeProfit[]>(
            `${this.API}/businesses/${businessId}/metrics/profit-by-price-type`, { params });
    }
}
