import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { MembershipResponse, AddMemberRequest, Role } from '../models/membership.model';
import { environment } from '../../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class MembershipService {
    private http = inject(HttpClient);
    private readonly API = `${environment.apiUrl}/api`;

    findByBusiness(businessId: string): Observable<MembershipResponse[]> {
        return this.http.get<MembershipResponse[]>(
            `${this.API}/businesses/${businessId}/members`);
    }

    addMember(businessId: string, req: AddMemberRequest): Observable<MembershipResponse> {
        return this.http.post<MembershipResponse>(
            `${this.API}/businesses/${businessId}/members`, req);
    }

    updateRole(businessId: string, membershipId: string, role: Role): Observable<MembershipResponse> {
        return this.http.patch<MembershipResponse>(
            `${this.API}/businesses/${businessId}/members/${membershipId}/role?role=${role}`,
            {});
    }

    removeMember(businessId: string, membershipId: string): Observable<void> {
        return this.http.delete<void>(
            `${this.API}/businesses/${businessId}/members/${membershipId}`);
    }
}
