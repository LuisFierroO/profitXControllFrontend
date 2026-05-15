import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { Router } from '@angular/router';
import { BusinessResponse } from '../../../../shared/models/business.model';
import { BusinessService } from '../../../../shared/services/business.service';
import { BusinessContextService } from '../../../../shared/services/business-context.service';
import { ThemeService } from '../../../../shared/services/theme.service';

@Component({
    selector: 'app-nav-bar',
    imports: [RouterLink, RouterLinkActive, MatIconModule],
    templateUrl: './nav-bar.html',
    styleUrl: './nav-bar.scss',
})
export class NavBar implements OnInit {
    private router     = inject(Router);
    businessService    = inject(BusinessService);
    context            = inject(BusinessContextService);

    theme    = inject(ThemeService);
    business = signal<BusinessResponse | null>(null);
    menuOpen = signal(false);

    readonly placeholder =
        'data:image/svg+xml;base64,' +
        btoa('<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40"><rect width="40" height="40" rx="8" fill="#27272a"/><text x="20" y="25" text-anchor="middle" font-family="sans-serif" font-size="16" fill="#52525b">B</text></svg>');

    get canManage(): boolean {
        const r = this.context.role();
        return r === 'OWNER' || r === 'ADMIN';
    }

    get isOwner(): boolean {
        return this.context.role() === 'OWNER';
    }

    get roleLabel(): string {
        const labels: Record<string, string> = {
            OWNER: 'Propietario', ADMIN: 'Administrador', EMPLOYEE: 'Empleado',
        };
        return this.context.role() ? (labels[this.context.role()!] ?? '') : '';
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

    onImgError(event: Event): void {
        const img = event.target as HTMLImageElement;
        img.onerror = null;
        img.src = this.placeholder;
    }

    toggleMenu(): void { this.menuOpen.update(v => !v); }
    closeMenu(): void  { this.menuOpen.set(false); }

    exit(): void {
        this.closeMenu();
        this.context.clear();
        this.router.navigate(['/app/bussines/list']);
    }
}
