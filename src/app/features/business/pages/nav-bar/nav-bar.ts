import { Component, OnInit, inject, signal } from '@angular/core';
import { MatCard, MatCardContent } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatLabel } from '@angular/material/form-field';
import { Router } from '@angular/router';
import { BusinessResponse } from '../../../../shared/models/business.model';
import { BusinessService } from '../../../../shared/services/business.service';
import { BusinessContextService } from '../../../../shared/services/business-context.service';

@Component({
    selector: 'app-nav-bar',
    imports: [
        MatCard,
        MatCardContent,
        MatButtonModule,
        MatFormFieldModule,
        MatLabel,
    ],
    templateUrl: './nav-bar.html',
    styleUrl: './nav-bar.scss',
})
export class NavBar implements OnInit {

    constructor(private router: Router) {}

    businessService = inject(BusinessService);
    context = inject(BusinessContextService);

    business = signal<BusinessResponse | null>(null);

    get currentUserRole() { return this.context.role(); }
    get canManage(): boolean {
        const r = this.context.role();
        return r === 'OWNER' || r === 'ADMIN';
    }

    ngOnInit(): void {
        const businessId = localStorage.getItem('currentBusinessId');
        if (businessId) {
            this.businessService.getById(businessId).subscribe({
                next: (business: BusinessResponse) => {
                    this.business.set(business);
                    this.context.setRole(business.currentUserRole);
                },
                error: () => {},
            });
        }
    }

    get isOwner(): boolean { return this.context.role() === 'OWNER'; }

    listProducts()  { this.router.navigate(['dashboard/products']); }
    sellProducts()  { this.router.navigate(['dashboard/sale']); }
    listSales()     { this.router.navigate(['dashboard/sales']); }
    listExpenses()  { this.router.navigate(['dashboard/expenses']); }
    profitability() { this.router.navigate(['dashboard/profitability']); }
    employees()     { this.router.navigate(['dashboard/members']); }
    metrics()       { this.router.navigate(['dashboard/metrics']); }
    auditLog()      { this.router.navigate(['dashboard/audit']); }

    exit(): void {
        this.context.clear();
        this.router.navigate(['/app/bussines/list']);
    }
}
