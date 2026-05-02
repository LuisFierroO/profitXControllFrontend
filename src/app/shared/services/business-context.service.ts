import { Injectable, signal } from '@angular/core';

export type BusinessRole = 'OWNER' | 'ADMIN' | 'EMPLOYEE';

@Injectable({ providedIn: 'root' })
export class BusinessContextService {
    private readonly _role = signal<BusinessRole | null>(null);
    readonly role = this._role.asReadonly();

    setRole(role: BusinessRole | null): void {
        this._role.set(role);
    }

    set(businessId: string, role: BusinessRole | null): void {
        localStorage.setItem('currentBusinessId', businessId);
        this._role.set(role);
    }

    clear(): void {
        localStorage.removeItem('currentBusinessId');
        this._role.set(null);
    }
}
