import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { BusinessPriceType } from '../models/business-price-type.model';

@Injectable({ providedIn: 'root' })
export class BusinessPriceTypeService {

    private http = inject(HttpClient);

    private base(businessId: string): string {
        return `${environment.apiUrl}/api/businesses/${businessId}/price-types`;
    }

    findAll(businessId: string) {
        return this.http.get<BusinessPriceType[]>(this.base(businessId), { withCredentials: true });
    }

    create(businessId: string, name: string) {
        return this.http.post<BusinessPriceType>(this.base(businessId), { name }, { withCredentials: true });
    }

    update(businessId: string, id: string, name: string) {
        return this.http.put<BusinessPriceType>(`${this.base(businessId)}/${id}`, { name }, { withCredentials: true });
    }

    delete(businessId: string, id: string) {
        return this.http.delete<void>(`${this.base(businessId)}/${id}`, { withCredentials: true });
    }
}
