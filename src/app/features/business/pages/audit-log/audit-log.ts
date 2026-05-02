import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { debounceTime } from 'rxjs';
import { AuditLogService } from '../../services/audit-log.service';
import { AuditLogResponse, ActionType } from '../../models/audit-log.model';
import { MatCardModule } from '@angular/material/card';

@Component({
    selector: 'app-audit-log',
    standalone: true,
    imports: [
        CommonModule,
        ReactiveFormsModule,
        MatButtonModule,
        MatFormFieldModule,
        MatInputModule,
        MatIconModule,
        MatDatepickerModule,
        MatNativeDateModule,
        MatProgressSpinnerModule,
        MatTooltipModule,
        MatSnackBarModule,
        MatCardModule,
    ],
    templateUrl: './audit-log.html',
    styleUrl: './audit-log.scss',
})
export class AuditLog implements OnInit {

    private auditLogService = inject(AuditLogService);
    private snackBar = inject(MatSnackBar);

    businessId!: string;
    isLoading = signal(true);
    currentPage = signal(0);
    totalPages = signal(1);

    private allLogs = signal<AuditLogResponse[]>([]);
    filteredLogs = signal<AuditLogResponse[]>([]);

    searchControl = new FormControl('');
    dateFrom = new FormControl<Date | null>(null);
    dateTo = new FormControl<Date | null>(null);

    hasFilters = computed(() =>
        !!this.searchControl.value || !!this.dateFrom.value || !!this.dateTo.value);

    ngOnInit(): void {
        const id = localStorage.getItem('currentBusinessId');
        if (!id) return;
        this.businessId = id;

        this.loadPage(0);
        this.searchControl.valueChanges.pipe(debounceTime(250)).subscribe(() => this.applyFilters());
        this.dateFrom.valueChanges.subscribe(() => this.applyFilters());
        this.dateTo.valueChanges.subscribe(() => this.applyFilters());
    }

    loadPage(page: number): void {
        this.isLoading.set(true);
        this.auditLogService.findByBusiness(this.businessId, page, 100).subscribe({
            next: result => {
                this.allLogs.set(result.content);
                this.currentPage.set(result.page);
                this.totalPages.set(result.totalPages);
                this.isLoading.set(false);
                this.applyFilters();
            },
            error: () => {
                this.snackBar.open('Error al cargar los registros', 'Cerrar', { duration: 3000 });
                this.isLoading.set(false);
            }
        });
    }

    private applyFilters(): void {
        const term = this.searchControl.value?.toLowerCase().trim() ?? '';
        const from = this.dateFrom.value;
        const to = this.dateTo.value;

        this.filteredLogs.set(this.allLogs().filter(entry => {
            const matchesText = !term ||
                (entry.userEmail?.toLowerCase() || '').includes(term) ||
                (entry.description?.toLowerCase() || '').includes(term);

            const entryDate = new Date(entry.timestamp);
            const matchesFrom = !from || entryDate >= from;
            const matchesTo = !to || entryDate <= new Date(new Date(to).setHours(23, 59, 59, 999));

            return matchesText && matchesFrom && matchesTo;
        }));
    }

    clearFilters(): void {
        this.searchControl.setValue('');
        this.dateFrom.setValue(null);
        this.dateTo.setValue(null);
    }

    actionLabel(action: ActionType): string {
        const labels: Record<ActionType, string> = {
            VENTA_CREADA: 'Venta creada',
            VENTA_MODIFICADA: 'Venta modificada',
            VENTA_ELIMINADA: 'Venta eliminada',
            PRODUCTO_CREADO: 'Producto creado',
            PRODUCTO_MODIFICADO: 'Producto modificado',
            PRODUCTO_ELIMINADO: 'Producto eliminado',
            GASTO_CREADO: 'Gasto creado',
            GASTO_ELIMINADO: 'Gasto eliminado',
            MIEMBRO_AGREGADO: 'Miembro agregado',
            ROL_MODIFICADO: 'Rol modificado',
            MIEMBRO_ELIMINADO: 'Miembro eliminado',
        };
        return labels[action] ?? action;
    }

    actionClass(action: ActionType): string {
        if (action.endsWith('_ELIMINADA') || action.endsWith('_ELIMINADO')) return 'badge-danger';
        if (action.endsWith('_CREADA') || action.endsWith('_CREADO')) return 'badge-success';
        return 'badge-info';
    }
}
