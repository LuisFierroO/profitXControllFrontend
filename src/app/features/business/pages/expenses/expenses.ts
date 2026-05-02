import { Component, inject, OnInit, signal, computed, WritableSignal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { ExpenseService } from '../../services/expense.service';
import { ExpenseResponse, ExpenseType, ProfitabilityResult } from '../../models/expense.model';
import { ProductService } from '../../services/product.service';
import { Product } from '../../models/product.model';
import { Subject, debounceTime, from, of, concatMap, toArray, catchError } from 'rxjs';
import { ConfirmDialogService } from '../../../../shared/services/confirm-dialog.service';
import { BusinessContextService } from '../../../../shared/services/business-context.service';
import { ExportService, ExportFormat, ExportColumn } from '../../../../shared/services/export.service';
import { ExportButton } from '../../../../shared/components/export-button/export-button';
import { ImportButton } from '../../../../shared/components/import-button/import-button';
import { ImportService } from '../../../../shared/services/import.service';
import { ImportPreviewDialog } from '../../../../shared/components/import-preview-dialog/import-preview-dialog';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { ProfitabilityPanel } from '../../components/profitability-panel/profitability-panel';

interface InventoryItem {
    productId: string;
    productName: string;
    imgUrl: string | null;
    quantity: number;
    unitCost: number;
}

@Component({
    selector: 'app-expenses',
    standalone: true,
    imports: [
        CommonModule,
        ReactiveFormsModule,
        MatButtonModule,
        MatButtonToggleModule,
        MatCardModule,
        MatDividerModule,
        MatFormFieldModule,
        MatInputModule,
        MatIconModule,
        MatDatepickerModule,
        MatNativeDateModule,
        MatProgressSpinnerModule,
        MatTooltipModule,
        MatSnackBarModule,
        MatDialogModule,
        ExportButton,
        ImportButton,
        ProfitabilityPanel,
    ],
    templateUrl: './expenses.html',
    styleUrl: './expenses.scss',
})
export class Expenses implements OnInit {

    private expenseService = inject(ExpenseService);
    private productService = inject(ProductService);
    private fb = inject(FormBuilder);
    private snackBar = inject(MatSnackBar);
    private confirmDialog = inject(ConfirmDialogService);
    private exportService = inject(ExportService);
    private importService = inject(ImportService);
    private dialog = inject(MatDialog);
    protected context = inject(BusinessContextService);

    private readonly exportColumns: ExportColumn[] = [
        { key: 'description', header: 'Descripción' },
        { key: 'amount',      header: 'Monto',          format: v => v != null ? Number(v) : '' },
        { key: 'type',        header: 'Tipo' },
        { key: 'productName', header: 'Nombre Producto' },
        { key: 'quantity',    header: 'Cantidad',       format: v => v != null ? Number(v) : '' },
        { key: 'unitCost',    header: 'Costo Unitario', format: v => v != null ? Number(v) : '' },
    ];

    businessId!: string;

    // ── Signals ──────────────────────────────────────────────────────────────
    allExpenses            = signal<ExpenseResponse[]>([]);
    isLoading              = signal(true);
    isSubmitting           = signal(false);
    showCreateDialog       = signal(false);
    showEditDialog         = signal(false);
    editingExpense         = signal<ExpenseResponse | null>(null);
    showProductPicker      = signal(false);
    inventoryItems         = signal<InventoryItem[]>([]);
    editInventoryItems     = signal<InventoryItem[]>([]);
    allProducts            = signal<Product[]>([]);

    // Profitability
    profitabilityResults     = signal<ProfitabilityResult[]>([]);
    editProfitabilityResults = signal<ProfitabilityResult[]>([]);
    isProfitabilityLoading   = signal(false);

    private readonly profitabilitySubject$     = new Subject<void>();
    private readonly editProfitabilitySubject$ = new Subject<void>();

    // 'create' | 'edit' — determines which list the product picker targets
    pickerContext: 'create' | 'edit' = 'create';

    // ── Computed ─────────────────────────────────────────────────────────────
    filteredExpenses = computed(() => {
        const expenses = this.allExpenses();
        const term  = this.searchControl.value?.toLowerCase().trim() ?? '';
        const type  = this.typeFilter.value ?? 'ALL';
        const from  = this.dateFrom.value;
        const to    = this.dateTo.value;

        return expenses.filter(e => {
            const matchesSearch = !term ||
                e.description.toLowerCase().includes(term) ||
                e.purchasedItems?.some(i => i.productName.toLowerCase().includes(term));
            const matchesType = type === 'ALL' || e.type === type;
            const date = new Date(e.date);
            const matchesFrom = !from || date >= from;
            const matchesTo   = !to   || date <= new Date(new Date(to).setHours(23,59,59));
            return matchesSearch && matchesType && matchesFrom && matchesTo;
        });
    });

    totalFiltered = computed(() =>
        this.filteredExpenses().reduce((sum, e) => sum + e.amount, 0));

    inventoryTotal = computed(() =>
        this.inventoryItems().reduce((sum, i) => sum + i.quantity * i.unitCost, 0));

    editInventoryTotal = computed(() =>
        this.editInventoryItems().reduce((sum, i) => sum + i.quantity * i.unitCost, 0));

    filteredPickerProducts = computed(() => {
        const term = this.productSearch.value?.toLowerCase().trim() ?? '';
        return this.allProducts().filter(p =>
            p.hasStock && (!term || p.name.toLowerCase().includes(term)));
    });

    hasBadProfitability = computed(() =>
        this.profitabilityResults().some(r => r.verdict === 'NO_RENTABLE'));

    editHasBadProfitability = computed(() =>
        this.editProfitabilityResults().some(r => r.verdict === 'NO_RENTABLE'));

    // Filtros
    searchControl = new FormControl('');
    typeFilter    = new FormControl<'ALL' | ExpenseType>('ALL');
    dateFrom      = new FormControl<Date | null>(null);
    dateTo        = new FormControl<Date | null>(null);
    productSearch = new FormControl('');

    expenseForm!: FormGroup;
    editExpenseForm!: FormGroup;

    readonly placeholder = 'data:image/svg+xml;base64,' + btoa(
        '<svg xmlns="http://www.w3.org/2000/svg" width="44" height="44">' +
        '<rect width="44" height="44" fill="#e0e0e0"/>' +
        '</svg>'
    );
    get canManageImports(): boolean {
        return this.context.role() === 'OWNER';
    }

    ngOnInit(): void {
        const id = localStorage.getItem('currentBusinessId');
        if (!id) return;
        this.businessId = id;

        this.loadExpenses();
        this.loadProducts();
        this.initForm();

        this.searchControl.valueChanges.pipe(debounceTime(250))
            .subscribe(() => this.allExpenses.update(v => [...v]));
        this.typeFilter.valueChanges.subscribe(() => this.allExpenses.update(v => [...v]));
        this.dateFrom.valueChanges.subscribe(() => this.allExpenses.update(v => [...v]));
        this.dateTo.valueChanges.subscribe(() => this.allExpenses.update(v => [...v]));

        this.profitabilitySubject$.pipe(debounceTime(600))
            .subscribe(() => this.fetchProfitabilityFor(this.inventoryItems(), this.profitabilityResults, false));

        this.editProfitabilitySubject$.pipe(debounceTime(600))
            .subscribe(() => this.fetchProfitabilityFor(this.editInventoryItems(), this.editProfitabilityResults, false));
    }

    // ── Profitability ─────────────────────────────────────────────────────────

    private fetchProfitabilityFor(
        items: InventoryItem[],
        target: WritableSignal<ProfitabilityResult[]>,
        showLoader = true
    ): void {
        const eligible = items.filter(i => i.unitCost > 0);
        if (eligible.length === 0) {
            target.set([]);
            return;
        }
        if (showLoader) this.isProfitabilityLoading.set(true);
        this.expenseService.checkProfitability(
            this.businessId,
            eligible.map(i => ({ productId: i.productId, unitCost: i.unitCost }))
        ).subscribe({
            next: results => {
                target.set(results);
                this.isProfitabilityLoading.set(false);
            },
            error: () => this.isProfitabilityLoading.set(false),
        });
    }

    private loadExpenses(): void {
        this.isLoading.set(true);
        this.expenseService.findByBusiness(this.businessId).subscribe({
            next: expenses => {
                this.allExpenses.set(
                    expenses.sort((a, b) =>
                        new Date(b.date).getTime() - new Date(a.date).getTime()));
                this.isLoading.set(false);
            },
            error: () => {
                this.snackBar.open('Error al cargar los gastos', 'Cerrar', { duration: 3000 });
                this.isLoading.set(false);
            }
        });
    }

    private loadProducts(): void {
        this.productService.findByBusiness(this.businessId).subscribe({
            next: products => this.allProducts.set(products),
            error: () => {}
        });
    }

    initForm(): void {
        this.expenseForm = this.fb.group({
            description: ['', Validators.required],
            type:        ['SIMPLE', Validators.required],
            amount:      [null],
        });
    }

    clearFilters(): void {
        this.searchControl.setValue('');
        this.typeFilter.setValue('ALL');
        this.dateFrom.setValue(null);
        this.dateTo.setValue(null);
    }

    onImport(file: File): void {
        this.importService.readFile(file).then(rows => {
            const { valid, errors } = this.importService.validateExpenseRows(rows, this.allProducts());

            const ref = this.dialog.open(ImportPreviewDialog, {
                data: {
                    title: 'Importar Gastos',
                    templateType: 'expenses',
                    validCount: valid.length,
                    errors,
                    previewColumns: [
                        { key: 'description', label: 'Descripción' },
                        { key: 'typeLabel',   label: 'Tipo' },
                        { key: 'amount',      label: 'Monto' },
                    ],
                    previewRows: valid.map(r => ({
                        description: r.description,
                        typeLabel:   r.type === 'INVENTORY' ? 'Inventario' : 'Simple',
                        amount:      r.type === 'SIMPLE'
                            ? (r.amount ?? 0).toLocaleString('es-CO')
                            : (r.inventoryItems ?? []).reduce((s, i) => s + i.quantity * i.unitCost, 0).toLocaleString('es-CO'),
                    })),
                },
            });

            ref.afterClosed().subscribe(confirmed => {
                if (!confirmed) return;
                this.snackBar.open('Importando gastos...', '', { duration: 0 });
                from(valid).pipe(
                    concatMap(req =>
                        this.expenseService.create(this.businessId, req).pipe(
                            catchError(() => of(null))
                        )
                    ),
                    toArray()
                ).subscribe(results => {
                    const ok  = results.filter(r => r !== null).length;
                    const bad = results.length - ok;
                    this.snackBar.open(
                        `${ok} gasto(s) importado(s)${bad ? `, ${bad} fallaron` : ''}`,
                        'Cerrar', { duration: 4000 }
                    );
                    this.loadExpenses();
                    this.loadProducts();
                });
            });
        }).catch(() => this.snackBar.open('Error al leer el archivo', 'Cerrar', { duration: 3000 }));
    }

    onExport(format: ExportFormat): void {
        const expenses = this.filteredExpenses();
        if (!expenses.length) {
            this.snackBar.open('No hay gastos para exportar', 'Cerrar', { duration: 2500 });
            return;
        }
        const rows: Record<string, any>[] = expenses.flatMap((e): Record<string, any>[] => {
            if (e.type === 'INVENTORY' && e.purchasedItems?.length) {
                return e.purchasedItems.map(item => ({
                    description: e.description,
                    amount:      null,
                    type:        e.type,
                    productName: item.productName,
                    quantity:    item.quantity,
                    unitCost:    item.unitCost,
                }));
            }
            return [{
                description: e.description,
                amount:      e.amount,
                type:        e.type,
                productName: null,
                quantity:    null,
                unitCost:    null,
            }];
        });
        const businessName = localStorage.getItem('currentBusinessName') ?? 'negocio';
        this.exportService.export(format, `gastos_${businessName}`, this.exportColumns, rows, 'Gastos');
    }

    // ── Dialog crear ──────────────────────────────────────────────────────────

    openCreateDialog(): void {
        this.initForm();
        this.inventoryItems.set([]);
        this.profitabilityResults.set([]);
        this.showCreateDialog.set(true);
    }

    closeCreateDialog(): void {
        this.showCreateDialog.set(false);
        this.profitabilityResults.set([]);
    }

    setType(type: ExpenseType): void {
        this.expenseForm.patchValue({ type });
        if (type === 'INVENTORY') {
            this.expenseForm.get('amount')?.clearValidators();
        } else {
            this.expenseForm.get('amount')?.setValidators([Validators.required, Validators.min(0.01)]);
            this.profitabilityResults.set([]);
        }
        this.expenseForm.get('amount')?.updateValueAndValidity();
    }

    canSubmit(): boolean {
        if (!this.expenseForm.valid) return false;
        const type = this.expenseForm.get('type')?.value;
        if (type === 'INVENTORY') {
            return this.inventoryItems().length > 0 &&
                   this.inventoryItems().every(i => i.quantity > 0 && i.unitCost > 0);
        }
        return (this.expenseForm.get('amount')?.value ?? 0) > 0;
    }

    createExpense(): void {
        if (!this.canSubmit()) return;
        this.isSubmitting.set(true);

        const values = this.expenseForm.value;
        const type: ExpenseType = values.type;

        const payload: any = {
            description: values.description,
            type,
        };

        if (type === 'SIMPLE') {
            payload.amount = values.amount;
        } else {
            payload.inventoryItems = this.inventoryItems().map(i => ({
                productId: i.productId,
                quantity:  i.quantity,
                unitCost:  i.unitCost,
            }));
        }

        this.expenseService.create(this.businessId, payload).subscribe({
            next: (created) => {
                this.snackBar.open('Gasto registrado correctamente', 'Cerrar', { duration: 3000 });
                this.allExpenses.update(list => [created, ...list]);
                this.showCreateDialog.set(false);
                this.profitabilityResults.set([]);
                this.isSubmitting.set(false);
                if (type === 'INVENTORY') this.loadProducts();
            },
            error: (err) => {
                const msg = err.error?.error ?? 'Error al registrar el gasto';
                this.snackBar.open(msg, 'Cerrar', { duration: 4000 });
                this.isSubmitting.set(false);
            }
        });
    }

    // ── Dialog editar ─────────────────────────────────────────────────────────

    openEditDialog(expense: ExpenseResponse): void {
        this.editingExpense.set(expense);
        this.editExpenseForm = this.fb.group({
            description: [expense.description, Validators.required],
            amount: [expense.type === 'SIMPLE' ? expense.amount : null],
        });
        if (expense.type === 'INVENTORY') {
            const items = (expense.purchasedItems ?? []).map(item => {
                const product = this.allProducts().find(p => p.id === item.productId);
                return {
                    productId:   item.productId,
                    productName: item.productName,
                    imgUrl:      product?.imgUrl ?? null,
                    quantity:    item.quantity,
                    unitCost:    item.unitCost,
                };
            });
            this.editInventoryItems.set(items);
            // Fetch profitability immediately for existing items
            this.fetchProfitabilityFor(items, this.editProfitabilityResults, true);
        } else {
            this.editInventoryItems.set([]);
            this.editProfitabilityResults.set([]);
        }
        this.showEditDialog.set(true);
    }

    closeEditDialog(): void {
        this.showEditDialog.set(false);
        this.editingExpense.set(null);
        this.editInventoryItems.set([]);
        this.editProfitabilityResults.set([]);
    }

    canEditSubmit(): boolean {
        if (!this.editExpenseForm?.valid) return false;
        const expense = this.editingExpense();
        if (!expense) return false;
        if (expense.type === 'INVENTORY') {
            return this.editInventoryItems().length > 0 &&
                   this.editInventoryItems().every(i => i.quantity > 0 && i.unitCost > 0);
        }
        return (this.editExpenseForm.get('amount')?.value ?? 0) > 0;
    }

    updateExpense(): void {
        if (!this.canEditSubmit()) return;
        const expense = this.editingExpense();
        if (!expense) return;

        this.isSubmitting.set(true);
        const values = this.editExpenseForm.value;

        const payload: any = { description: values.description };

        if (expense.type === 'SIMPLE') {
            payload.amount = values.amount;
        } else {
            payload.inventoryItems = this.editInventoryItems().map(i => ({
                productId: i.productId,
                quantity:  i.quantity,
                unitCost:  i.unitCost,
            }));
        }

        this.expenseService.update(this.businessId, expense.id, payload).subscribe({
            next: (updated) => {
                this.snackBar.open('Gasto actualizado correctamente', 'Cerrar', { duration: 3000 });
                this.allExpenses.update(list => list.map(e => e.id === updated.id ? updated : e));
                this.showEditDialog.set(false);
                this.editingExpense.set(null);
                this.editProfitabilityResults.set([]);
                this.isSubmitting.set(false);
                if (expense.type === 'INVENTORY') this.loadProducts();
            },
            error: (err) => {
                const msg = err.error?.error ?? 'Error al actualizar el gasto';
                this.snackBar.open(msg, 'Cerrar', { duration: 5000 });
                this.isSubmitting.set(false);
            }
        });
    }

    deleteExpense(expense: ExpenseResponse): void {
        this.confirmDialog.confirm('¿Confirmas que deseas eliminar este gasto?')
            .subscribe(confirmed => {
                if (!confirmed) return;
                this.expenseService.delete(this.businessId, expense.id).subscribe({
                    next: () => {
                        this.snackBar.open('Gasto eliminado', 'Cerrar', { duration: 3000 });
                        this.allExpenses.update(list => list.filter(e => e.id !== expense.id));
                        if (expense.type === 'INVENTORY') this.loadProducts();
                    },
                    error: (err) => {
                        const msg = err.error?.error ?? 'Error al eliminar el gasto';
                        this.snackBar.open(msg, 'Cerrar', { duration: 5000 });
                    }
                });
            });
    }

    // ── Picker de productos ───────────────────────────────────────────────────

    openProductPicker(): void {
        this.pickerContext = 'create';
        this.productSearch.setValue('');
        this.showProductPicker.set(true);
    }

    openEditProductPicker(): void {
        this.pickerContext = 'edit';
        this.productSearch.setValue('');
        this.showProductPicker.set(true);
    }

    closeProductPicker(): void {
        this.showProductPicker.set(false);
    }

    selectProduct(product: Product): void {
        if (this.isAlreadyAdded(product.id)) return;

        const newItem: InventoryItem = {
            productId:   product.id,
            productName: product.name,
            imgUrl:      product.imgUrl,
            quantity:    1,
            unitCost:    0,
        };

        if (this.pickerContext === 'edit') {
            this.editInventoryItems.update(list => [...list, newItem]);
        } else {
            this.inventoryItems.update(list => [...list, newItem]);
        }
        this.showProductPicker.set(false);
    }

    isAlreadyAdded(productId: string): boolean {
        if (this.pickerContext === 'edit') {
            return this.editInventoryItems().some(i => i.productId === productId);
        }
        return this.inventoryItems().some(i => i.productId === productId);
    }

    // Create item management

    updateItemQty(index: number, qty: number): void {
        this.inventoryItems.update(list => {
            const updated = [...list];
            updated[index] = { ...updated[index], quantity: Math.max(1, qty) };
            return updated;
        });
    }

    updateItemCost(index: number, cost: number): void {
        this.inventoryItems.update(list => {
            const updated = [...list];
            updated[index] = { ...updated[index], unitCost: Math.max(0, cost) };
            return updated;
        });
        this.profitabilitySubject$.next();
    }

    removeInventoryItem(index: number): void {
        this.inventoryItems.update(list => list.filter((_, i) => i !== index));
        this.profitabilitySubject$.next();
    }

    // Edit item management

    updateItemQtyEdit(index: number, qty: number): void {
        this.editInventoryItems.update(list => {
            const updated = [...list];
            updated[index] = { ...updated[index], quantity: Math.max(1, qty) };
            return updated;
        });
    }

    updateItemCostEdit(index: number, cost: number): void {
        this.editInventoryItems.update(list => {
            const updated = [...list];
            updated[index] = { ...updated[index], unitCost: Math.max(0, cost) };
            return updated;
        });
        this.editProfitabilitySubject$.next();
    }

    removeInventoryItemEdit(index: number): void {
        this.editInventoryItems.update(list => list.filter((_, i) => i !== index));
        this.editProfitabilitySubject$.next();
    }

    onImgError(event: Event): void {
        const img = event.target as HTMLImageElement;
        img.onerror = null;
        img.src = this.placeholder;
    }
}
