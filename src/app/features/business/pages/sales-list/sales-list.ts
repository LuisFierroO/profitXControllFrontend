import { Component, inject, OnInit, signal, WritableSignal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { SaleService } from '../../services/sale.service';
import { SaleResponse } from '../../models/sale.model';
import { EditSaleDialog } from '../edit-sale-dialog/edit-sale-dialog';
import { debounceTime } from 'rxjs';
import { computed } from '@angular/core';
import { ChangeDetectorRef } from '@angular/core';
import { ExportService, ExportFormat, ExportColumn } from '../../../../shared/services/export.service';
import { BusinessContextService } from '../../../../shared/services/business-context.service';
import { ExportButton } from '../../../../shared/components/export-button/export-button';
import { ImportButton } from '../../../../shared/components/import-button/import-button';
import { ImportService } from '../../../../shared/services/import.service';
import { ImportPreviewDialog } from '../../../../shared/components/import-preview-dialog/import-preview-dialog';
import { ProductService } from '../../services/product.service';
import { Product } from '../../models/product.model';
import { from, of, concatMap, toArray, catchError } from 'rxjs';

@Component({
    selector: 'app-sales-list',
    standalone: true,
    imports: [
        CommonModule,
        ReactiveFormsModule,
        MatButtonModule,
        MatCardModule,
        MatDividerModule,
        MatFormFieldModule,
        MatInputModule,
        MatIconModule,
        MatDatepickerModule,
        MatNativeDateModule,
        MatProgressSpinnerModule,
        MatTooltipModule,
        MatDialogModule,
        MatSnackBarModule,
        ExportButton,
        ImportButton,
    ],
    templateUrl: './sales-list.html',
    styleUrl: './sales-list.scss',
})
export class SalesList implements OnInit {

    private saleService = inject(SaleService);
    private productService = inject(ProductService);
    private dialog = inject(MatDialog);
    private snackBar = inject(MatSnackBar);
    private cdr = inject(ChangeDetectorRef);
    private exportService = inject(ExportService);
    private importService = inject(ImportService);
    protected context = inject(BusinessContextService);

    private allBusinessProducts: Product[] = [];

    private readonly exportColumns: ExportColumn[] = [
        { key: 'ventaNum',    header: 'Venta #' },
        { key: 'productName', header: 'Nombre Producto' },
        { key: 'quantity',    header: 'Cantidad',       format: v => Number(v) },
        { key: 'amountPaid',  header: 'Pago Recibido',  format: v => (v !== '' && v != null) ? Number(v) : '' },
        { key: 'change',      header: 'Cambio',          format: v => (v !== '' && v != null) ? Number(v) : '' },
    ];

    businessId!: string;
    allSales = signal<SaleResponse[]>([]);
    filteredSales= signal<SaleResponse[]>([]);
    isLoading = true;

    searchControl = new FormControl('');
    dateFrom = new FormControl<Date | null>(null);
    dateTo   = new FormControl<Date | null>(null);

    hasFilters = computed(() =>
        !!this.searchControl.value ||
        !!this.dateFrom.value ||
        !!this.dateTo.value
    );

    get canManageImports(): boolean { return this.context.role() === 'OWNER'; }
    get canManage(): boolean {
        const r = this.context.role();
        return r === 'OWNER' || r === 'ADMIN';
    }
    get totalFiltered(): number {
        return this.filteredSales().reduce((sum, s) => sum + s.total, 0);
    }

    ngOnInit(): void {
        const id = localStorage.getItem('currentBusinessId');
        if (!id) return;
        this.businessId = id;

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        this.dateFrom.setValue(today);
        this.dateTo.setValue(today);

        this.loadSales();
        this.productService.findByBusiness(this.businessId)
            .subscribe(products => this.allBusinessProducts = products);
        this.searchControl.valueChanges.pipe(debounceTime(250))
            .subscribe(() => this.applyFilters());
        this.dateFrom.valueChanges.subscribe(() => this.applyFilters());
        this.dateTo.valueChanges.subscribe(() => this.applyFilters());
    }

    private loadSales(): boolean {
        this.isLoading = true;
        this.saleService.findByBusiness(this.businessId).subscribe({
            next: sales => {
                this.allSales.set(sales.sort((a, b) =>
                    new Date(b.date).getTime() - new Date(a.date).getTime()));
                this.isLoading = false;
                this.applyFilters();
                this.cdr.detectChanges();

                return true;
            },

            error: () => {
                this.snackBar.open('Error al cargar las ventas', 'Cerrar', { duration: 3000 });
                this.isLoading = false;
                return false;
            }
            
        });
        return false;
    }

    

    
    private applyFilters(): void {
        const term = this.searchControl.value?.toLowerCase().trim() ?? '';
        const from = this.dateFrom.value;
        const to   = this.dateTo.value;

        this.filteredSales.set(this.allSales().filter(sale => {
            // Filtro por texto: busca en ID y nombres de productos
            const matchesText = !term ||
                String(sale.id).includes(term) ||
                sale.items.some(i => i.productName.toLowerCase().includes(term));

            // Filtro por fecha
            const saleDate = new Date(sale.date);
            const matchesFrom = !from || saleDate >= from;
            const matchesTo = !to || saleDate <= new Date(
                new Date(to).setHours(23, 59, 59, 999)
            );

            return matchesText && matchesFrom && matchesTo;
        }));
    }

    clearFilters(): void {
        this.searchControl.setValue('');
        this.dateFrom.setValue(null);
        this.dateTo.setValue(null);
    }

    onImport(file: File): void {
        this.importService.readFile(file).then(rows => {
            const { valid, errors } = this.importService.validateSaleRows(rows, this.allBusinessProducts);

            const ref = this.dialog.open(ImportPreviewDialog, {
                data: {
                    title: 'Importar Ventas',
                    templateType: 'sales',
                    validCount: valid.length,
                    errors,
                    previewColumns: [
                        { key: 'label',      label: 'Venta' },
                        { key: 'items',      label: 'Productos' },
                        { key: 'itemsQty',   label: 'Cant. ítems' },
                        { key: 'amountPaid', label: 'Pago Recibido' },
                    ],
                    previewRows: valid.map(g => ({
                        label:      g.label,
                        items:      g.items.map(i => this.allBusinessProducts.find(p => p.id === i.productId)?.name ?? String(i.productId)).join(', '),
                        itemsQty:   g.items.length,
                        amountPaid: g.amountPaid != null ? g.amountPaid.toLocaleString('es-CO') : '—',
                    })),
                },
            });

            ref.afterClosed().subscribe(confirmed => {
                if (!confirmed) return;
                this.snackBar.open('Importando ventas...', '', { duration: 0 });
                from(valid).pipe(
                    concatMap(group =>
                        this.saleService.create(this.businessId, { items: group.items, amountPaid: group.amountPaid }).pipe(
                            catchError(() => of(null))
                        )
                    ),
                    toArray()
                ).subscribe(results => {
                    const ok  = results.filter(r => r !== null).length;
                    const bad = results.length - ok;
                    this.snackBar.open(
                        `${ok} venta(s) importada(s)${bad ? `, ${bad} fallaron` : ''}`,
                        'Cerrar', { duration: 4000 }
                    );
                    this.loadSales();
                });
            });
        }).catch(() => this.snackBar.open('Error al leer el archivo', 'Cerrar', { duration: 3000 }));
    }

    onExport(format: ExportFormat): void {
        const sales = this.filteredSales();
        if (!sales.length) {
            this.snackBar.open('No hay ventas para exportar', 'Cerrar', { duration: 2500 });
            return;
        }
        // Flatten: one row per sale item; payment info only on first row of each sale
        const rows: Record<string, any>[] = sales.flatMap(sale =>
            sale.items.map((item, idx) => ({
                ventaNum:    sale.id,
                productName: item.productName,
                quantity:    item.quantity,
                amountPaid:  idx === 0 ? (sale.amountPaid ?? '') : '',
                change:      idx === 0 ? (sale.change      ?? '') : '',
            }))
        );
        const businessName = localStorage.getItem('currentBusinessName') ?? 'negocio';
        this.exportService.export(format, `ventas_${businessName}`, this.exportColumns, rows, 'Ventas');
    }

    confirmingDeleteId = signal<string | null>(null);

    editSale(sale: SaleResponse): void {
        const ref = this.dialog.open(EditSaleDialog, {
            width: '600px',
            data: { sale, businessId: this.businessId }
        });

        ref.afterClosed().subscribe(updated => {
            if (updated) this.loadSales();
        });
    }

    requestDelete(sale: SaleResponse): void {
        this.confirmingDeleteId.set(sale.id);
    }

    cancelDelete(): void {
        this.confirmingDeleteId.set(null);
    }

    confirmDelete(sale: SaleResponse): void {
        this.saleService.delete(this.businessId, sale.id).subscribe({
            next: () => {
                this.confirmingDeleteId.set(null);
                this.snackBar.open('Venta eliminada correctamente', 'Cerrar', { duration: 3000 });
                this.loadSales();
            },
            error: (err) => {
                this.confirmingDeleteId.set(null);
                const msg = err.error?.error ?? 'Error al eliminar la venta';
                this.snackBar.open(msg, 'Cerrar', { duration: 4000 });
            }
        });
    }
}