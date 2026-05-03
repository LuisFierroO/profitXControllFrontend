import { Component, OnInit, inject, signal } from '@angular/core';
import { MatCard, MatCardContent } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatLabel } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
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
        MatIconModule,
    ],
    templateUrl: './nav-bar.html',
    styleUrl: './nav-bar.scss',
})
export class NavBar implements OnInit {

    constructor(private router: Router) {}

    businessService = inject(BusinessService);
    context         = inject(BusinessContextService);

    business  = signal<BusinessResponse | null>(null);
    menuOpen  = signal(false);

    get currentUserRole() { return this.context.role(); }
    get canManage(): boolean {
        const r = this.context.role();
        return r === 'OWNER' || r === 'ADMIN';
    }
    get isOwner(): boolean { return this.context.role() === 'OWNER'; }

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

    toggleMenu(): void { this.menuOpen.set(!this.menuOpen()); }

    listProducts()  { this.menuOpen.set(false); this.router.navigate(['dashboard/products']); }
    sellProducts()  { this.menuOpen.set(false); this.router.navigate(['dashboard/sale']); }
    listSales()     { this.menuOpen.set(false); this.router.navigate(['dashboard/sales']); }
    listExpenses()  { this.menuOpen.set(false); this.router.navigate(['dashboard/expenses']); }
    profitability() { this.menuOpen.set(false); this.router.navigate(['dashboard/profitability']); }
    employees()     { this.menuOpen.set(false); this.router.navigate(['dashboard/members']); }
    metrics()       { this.menuOpen.set(false); this.router.navigate(['dashboard/metrics']); }
    auditLog()      { this.menuOpen.set(false); this.router.navigate(['dashboard/audit']); }

    exit(): void {
        this.menuOpen.set(false);
        this.context.clear();
        this.router.navigate(['/app/bussines/list']);
    }
}
