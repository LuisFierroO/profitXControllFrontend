import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ProductService } from '../../services/product.service';
import { Product } from '../../models/product.model';
import { BusinessPriceType } from '../../models/business-price-type.model';
import { BusinessPriceTypeService } from '../../services/business-price-type.service';
import { debounceTime } from 'rxjs';
import { CreateProduct } from '../create-product/create-product';
import { EditProductDialog } from '../edit-product-dialog/edit-product-dialog';
import { ConfirmDialogService } from '../../../../shared/services/confirm-dialog.service';
import { BusinessContextService } from '../../../../shared/services/business-context.service';
import { ExportService, ExportFormat, ExportColumn } from '../../../../shared/services/export.service';
import { ExportButton } from '../../../../shared/components/export-button/export-button';
import { ImportButton } from '../../../../shared/components/import-button/import-button';
import { ImportService } from '../../../../shared/services/import.service';
import { ImportPreviewDialog } from '../../../../shared/components/import-preview-dialog/import-preview-dialog';
import { from, of, concatMap, toArray, catchError } from 'rxjs';

@Component({
    selector: 'app-products',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        ReactiveFormsModule,
        MatButtonModule,
        MatCardModule,
        MatFormFieldModule,
        MatInputModule,
        MatIconModule,
        MatSnackBarModule,
        MatDialogModule,
        MatTooltipModule,
        ExportButton,
        ImportButton,
    ],
    templateUrl: './products.html',
    styleUrl: './products.scss',
})
export class Products implements OnInit {

    private dialog = inject(MatDialog);
    private productService = inject(ProductService);
    private priceTypeService = inject(BusinessPriceTypeService);
    private snackBar = inject(MatSnackBar);
    private confirmDialog = inject(ConfirmDialogService);
    private exportService = inject(ExportService);
    private importService = inject(ImportService);
    protected context = inject(BusinessContextService);

    // ── price types ──────────────────────────────────────────────────────────
    priceTypes = signal<BusinessPriceType[]>([]);
    editingTypeId = signal<string | null>(null);
    editingTypeName = '';
    newTypeName = '';
    isAddingType = signal(false);

    private readonly exportColumns: ExportColumn[] = [
        { key: 'name',         header: 'Nombre' },
        { key: 'description',  header: 'Descripción' },
        { key: 'purchaseCost', header: 'Costo Compra', format: v => Number(v) },
        { key: 'prices',       header: 'Precio (Detal)', format: (v: any) => Array.isArray(v) ? (v[0]?.value ?? 0) : 0 },
        { key: 'hasStock',     header: 'Maneja Stock',  format: v => (v ? 'Sí' : 'No') },
        { key: 'stock',        header: 'Stock Actual',  format: v => Number(v) },
    ];

    myControl = new FormControl('');
    businessId!: string;
    allProducts = signal<Product[]>([]);
    filteredProducts = signal<Product[]>([]);

    readonly placeholder = 'data:image/svg+xml;base64,' + btoa(
        '<svg xmlns="http://www.w3.org/2000/svg" width="165" height="132">' +
        '<rect width="165" height="132" fill="#e0e0e0"/>' +
        '<text x="82" y="71" text-anchor="middle" font-family="sans-serif" font-size="13" fill="#9e9e9e">Sin imagen</text>' +
        '</svg>'
    );

    get canManageImports(): boolean {
        return this.context.role() === 'OWNER';
    }

    ngOnInit(): void {
        const id = localStorage.getItem('currentBusinessId');
        if (!id) {
            this.snackBar.open('No se encontro el negocio', 'Cerrar', { duration: 3000 });
            return;
        }
        this.businessId = id;
        this.loadProducts();
        this.loadPriceTypes();
        this.myControl.valueChanges
            .pipe(debounceTime(250))
            .subscribe(term => this.filterProducts(term ?? ''));
    }

    private loadPriceTypes(): void {
        this.priceTypeService.findAll(this.businessId).subscribe({
            next: types => this.priceTypes.set(types),
        });
    }

    addPriceType(): void {
        const name = this.newTypeName.trim();
        if (!name) return;
        this.priceTypeService.create(this.businessId, name).subscribe({
            next: t => {
                this.priceTypes.update(list => [...list, t]);
                this.newTypeName = '';
                this.isAddingType.set(false);
            },
            error: err => this.snackBar.open(err.error?.error ?? 'Error al crear tipo', 'Cerrar', { duration: 3000 }),
        });
    }

    startEditType(type: BusinessPriceType): void {
        this.editingTypeId.set(type.id);
        this.editingTypeName = type.name;
    }

    saveEditType(type: BusinessPriceType): void {
        const name = this.editingTypeName.trim();
        if (!name || name === type.name) { this.cancelEditType(); return; }
        this.priceTypeService.update(this.businessId, type.id, name).subscribe({
            next: updated => {
                this.priceTypes.update(list => list.map(t => t.id === updated.id ? updated : t));
                this.cancelEditType();
            },
            error: err => this.snackBar.open(err.error?.error ?? 'Error al actualizar', 'Cerrar', { duration: 3000 }),
        });
    }

    cancelEditType(): void {
        this.editingTypeId.set(null);
        this.editingTypeName = '';
    }

    deletePriceType(type: BusinessPriceType): void {
        this.confirmDialog.confirm(`¿Eliminar el tipo de precio "${type.name}"?`).subscribe(confirmed => {
            if (!confirmed) return;
            this.priceTypeService.delete(this.businessId, type.id).subscribe({
                next: () => this.priceTypes.update(list => list.filter(t => t.id !== type.id)),
                error: err => this.snackBar.open(err.error?.error ?? 'Error al eliminar', 'Cerrar', { duration: 3000 }),
            });
        });
    }

    private loadProducts(): void {
        this.productService.findByBusiness(this.businessId).subscribe({
            next: products => {
                this.allProducts.set(products);
                this.filteredProducts.set(products);
            },
            error: () => this.snackBar.open('Error al cargar los productos', 'Cerrar', { duration: 3000 })
        });
    }

    private filterProducts(term: string): void {
        const lower = term.toLowerCase().trim();
        this.filteredProducts.set(
            lower ? this.allProducts().filter(p => p.name.toLowerCase().includes(lower))
                  : this.allProducts()
        );
    }

    onImgError(event: Event): void {
        const img = event.target as HTMLImageElement;
        img.onerror = null;
        img.src = this.placeholder;
    }

    addProduct(): void {
        const dialogRef = this.dialog.open(CreateProduct, {
        width: '1000px',
        maxHeight: '100vh',
        panelClass: 'custom-dialog',
        disableClose: true
    });

    dialogRef.afterClosed().subscribe(result => {
        if (result) {
            this.loadProducts(); // 👈 recargar lista
        }
    });
}

    editProduct(product: Product): void {
        const ref = this.dialog.open(EditProductDialog, {
            width: '520px',
            data: { product, businessId: this.businessId }
        });
 
        ref.afterClosed().subscribe(updated => {
            if (updated) this.loadProducts();
        });
    }

    onImport(file: File): void {
        this.importService.readFile(file).then(rows => {
            const { valid, errors } = this.importService.validateProductRows(rows);

            const ref = this.dialog.open(ImportPreviewDialog, {
                data: {
                    title: 'Importar Productos',
                    templateType: 'products',
                    validCount: valid.length,
                    errors,
                    previewColumns: [
                        { key: 'name',         label: 'Nombre' },
                        { key: 'price',        label: 'Precio (Detal)' },
                        { key: 'hasStockLabel',label: 'Maneja Stock' },
                        { key: 'initialStock', label: 'Stock Inicial' },
                    ],
                    previewRows: valid.map(r => ({ ...r, hasStockLabel: r.hasStock ? 'Sí' : 'No' })),
                },
            });

            ref.afterClosed().subscribe(confirmed => {
                if (!confirmed) return;
                this.snackBar.open('Importando productos...', '', { duration: 0 });
                from(valid).pipe(
                    concatMap(row => {
                        const form = new FormData();
                        form.append('name',         row.name);
                        form.append('description',  row.description);
                        form.append('purchaseCost', '0');
                        form.append('prices',       JSON.stringify([{ name: 'Venta al detal', value: row.price }]));
                        form.append('hasStock',     String(row.hasStock));
                        form.append('initialStock', String(row.initialStock));
                        return this.productService.create(this.businessId, form).pipe(
                            catchError(() => of(null))
                        );
                    }),
                    toArray()
                ).subscribe(results => {
                    const ok  = results.filter(r => r !== null).length;
                    const bad = results.length - ok;
                    this.snackBar.open(
                        `${ok} producto(s) importado(s)${bad ? `, ${bad} fallaron` : ''}`,
                        'Cerrar', { duration: 4000 }
                    );
                    this.loadProducts();
                });
            });
        }).catch(() => this.snackBar.open('Error al leer el archivo', 'Cerrar', { duration: 3000 }));
    }

    onExport(format: ExportFormat): void {
        const data = this.filteredProducts() as Record<string, any>[];
        if (!data.length) {
            this.snackBar.open('No hay productos para exportar', 'Cerrar', { duration: 2500 });
            return;
        }
        const businessName = localStorage.getItem('currentBusinessName') ?? 'negocio';
        this.exportService.export(format, `productos_${businessName}`, this.exportColumns, data, 'Productos');
    }

    deleteProduct(product: Product): void {
        this.confirmDialog.confirm(`¿Confirmas que deseas eliminar el producto "${product.name}"?`)
            .subscribe(confirmed => {
                if (!confirmed) return;
                this.productService.delete(this.businessId, product.id).subscribe({
                    next: () => {
                        this.snackBar.open('Producto eliminado correctamente', 'Cerrar', { duration: 3000 });
                        this.allProducts.update(list => list.filter(p => p.id !== product.id));
                        this.filterProducts(this.myControl.value ?? '');
                    },
                    error: () => this.snackBar.open('Error al eliminar el producto', 'Cerrar', { duration: 3000 })
                });
            });
    }
}