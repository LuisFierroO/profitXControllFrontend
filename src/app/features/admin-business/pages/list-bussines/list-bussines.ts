import { Component, inject, OnInit, signal, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { BusinessService } from '../../../../shared/services/business.service';
import { BusinessContextService } from '../../../../shared/services/business-context.service';
import { BusinessResponse } from '../../../../shared/models/business.model';
import { debounceTime } from 'rxjs';
import { ConfirmDialogService } from '../../../../shared/services/confirm-dialog.service';

@Component({
    selector: 'app-list-bussines',
    standalone: true,
    imports: [
        CommonModule,
        ReactiveFormsModule,
        RouterLink,
        MatCardModule,
        MatButtonModule,
        MatButtonToggleModule,
        MatFormFieldModule,
        MatInputModule,
        MatIconModule,
        MatProgressSpinnerModule,
        MatSnackBarModule,
        MatTooltipModule,
    ],
    templateUrl: './list-bussines.html',
    styleUrl: './list-bussines.scss',
})
export class ListBussines implements OnInit {

    private businessService = inject(BusinessService);
    private router = inject(Router);
    private snackBar = inject(MatSnackBar);
    private cdr = inject(ChangeDetectorRef);
    private confirmDialog = inject(ConfirmDialogService);
    private context = inject(BusinessContextService);

    allBusinesses = signal<BusinessResponse[]>([]);
    filteredBusinesses: BusinessResponse[] = [];
    isLoading = true;

    searchControl = new FormControl('');
    roleFilter = new FormControl<'ALL' | 'OWNER' | 'ADMIN' | 'EMPLOYEE'>('ALL');

    // Placeholder inline en base64 — nunca hace peticion HTTP, nunca falla
    readonly PLACEHOLDER = 'data:image/svg+xml;base64,' + btoa(
        '<svg xmlns="http://www.w3.org/2000/svg" width="300" height="180">' +
        '<rect width="300" height="180" fill="#e0e0e0"/>' +
        '<text x="150" y="95" text-anchor="middle" font-family="sans-serif" font-size="14" fill="#9e9e9e">Sin imagen</text>' +
        '</svg>'
    );

    ngOnInit(): void {
        this.loadBusinesses();

        // debounceTime(0) posterga al siguiente ciclo de deteccion — resuelve NG0100
        this.searchControl.valueChanges
            .pipe(debounceTime(0))
            .subscribe(() => {
                this.applyFilters();
                this.cdr.detectChanges();
            });

        this.roleFilter.valueChanges
            .pipe(debounceTime(0))
            .subscribe(() => {
                this.applyFilters();
                this.cdr.detectChanges();
            });
    }

    private loadBusinesses(): void {
        this.isLoading = true;
        this.businessService.getMyBusinesses().subscribe({
            next: (businesses) => {
                this.allBusinesses.set(businesses);
                this.applyFilters();
                this.isLoading = false;
                this.cdr.detectChanges();
            },
            error: () => {
                this.snackBar.open('Error al cargar los negocios', 'Cerrar', { duration: 3000 });
                this.isLoading = false;
                this.cdr.detectChanges();
            }
        });
    }

    private applyFilters(): void {
        const term = this.searchControl.value?.toLowerCase().trim() ?? '';
        const role = this.roleFilter.value ?? 'ALL';

        this.filteredBusinesses = this.allBusinesses().filter(b => {
            const matchesSearch = b.name.toLowerCase().includes(term);
            const matchesRole = role === 'ALL' || b.currentUserRole === role;
            return matchesSearch && matchesRole;
        });
    }

    clearFilters(): void {
        this.searchControl.setValue('');
        this.roleFilter.setValue('ALL');
    }

    // Resuelve loop infinito:
    // 1. img.onerror = null desactiva el handler antes de cambiar src
    // 2. PLACEHOLDER es base64 — no hace peticion HTTP, nunca dispara onerror
    onImgError(event: Event): void {
        const img = event.target as HTMLImageElement;
        img.onerror = null;
        img.src = this.PLACEHOLDER;
    }

    accesBussines(businessId: string): void {
        const role = this.allBusinesses().find(b => b.id === businessId)?.currentUserRole ?? null;
        this.context.set(businessId, role);
        this.router.navigate(['/dashboard/sale']);
    }

    editBussines(businessId: string): void {
        this.router.navigate(['/app/bussines', businessId, 'edit']);
    }

    deleteBussines(business: BusinessResponse): void {
        this.confirmDialog.confirm(`¿Confirmas que deseas eliminar "${business.name}"? Esta acción no se puede deshacer.`)
            .subscribe(confirmed => {
                if (!confirmed) return;
                this.businessService.delete(business.id).subscribe({
                    next: () => {
                        this.snackBar.open('Negocio eliminado', 'Cerrar', { duration: 3000 });
                        this.allBusinesses.update(list => list.filter(b => b.id !== business.id));
                        this.applyFilters();
                        this.cdr.detectChanges();
                    },
                    error: () => {
                        this.snackBar.open('Error al eliminar el negocio', 'Cerrar', { duration: 3000 });
                    }
                });
            });
    }

    getRoleLabel(role: string | null): string {
        const labels: Record<string, string> = {
            OWNER:    'Dueno',
            ADMIN:    'Administrador',
            EMPLOYEE: 'Empleado',
        };
        return role ? (labels[role] ?? role) : '';
    }

    getRoleClass(role: string | null): string {
        const classes: Record<string, string> = {
            OWNER:    'role-owner',
            ADMIN:    'role-admin',
            EMPLOYEE: 'role-employee',
        };
        return role ? (classes[role] ?? '') : '';
    }
}