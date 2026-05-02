import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Subject, debounceTime } from 'rxjs';
import { ProductService } from '../../services/product.service';
import { ExpenseService } from '../../services/expense.service';
import { Product } from '../../models/product.model';
import { ProfitabilityResult } from '../../models/expense.model';
import { ProfitabilityPanel } from '../../components/profitability-panel/profitability-panel';

interface ProductCostRow {
    product: Product;
    unitCost: number;
}

@Component({
    selector: 'app-profitability',
    standalone: true,
    imports: [
        CommonModule,
        ReactiveFormsModule,
        MatButtonModule,
        MatCardModule,
        MatFormFieldModule,
        MatInputModule,
        MatIconModule,
        MatProgressSpinnerModule,
        ProfitabilityPanel,
    ],
    templateUrl: './profitability.html',
    styleUrl: './profitability.scss',
})
export class Profitability implements OnInit {

    private productService = inject(ProductService);
    private expenseService = inject(ExpenseService);

    businessId!: string;

    rows = signal<ProductCostRow[]>([]);
    isLoadingProducts = signal(true);
    profitabilityResults = signal<ProfitabilityResult[]>([]);
    isProfitabilityLoading = signal(false);

    searchControl = new FormControl('');

    private readonly recalcSubject$ = new Subject<void>();

    filteredRows = computed(() => {
        const term = this.searchControl.value?.toLowerCase().trim() ?? '';
        return this.rows().filter(r =>
            !term || r.product.name.toLowerCase().includes(term));
    });

    activeCount = computed(() =>
        this.rows().filter(r => r.unitCost > 0).length);

    readonly placeholder = 'data:image/svg+xml;base64,' + btoa(
        '<svg xmlns="http://www.w3.org/2000/svg" width="44" height="44">' +
        '<rect width="44" height="44" fill="#e0e0e0"/>' +
        '</svg>'
    );

    ngOnInit(): void {
        const id = localStorage.getItem('currentBusinessId');
        if (!id) return;
        this.businessId = id;

        this.productService.findByBusiness(this.businessId).subscribe({
            next: products => {
                this.rows.set(products.map(p => ({ product: p, unitCost: 0 })));
                this.isLoadingProducts.set(false);
            },
            error: () => this.isLoadingProducts.set(false),
        });

        this.recalcSubject$.pipe(debounceTime(600)).subscribe(() => this.recalculate());
    }

    updateCost(productId: string, value: number): void {
        this.rows.update(list =>
            list.map(r =>
                r.product.id === productId
                    ? { ...r, unitCost: Math.max(0, value || 0) }
                    : r
            )
        );
        this.recalcSubject$.next();
    }

    clearCosts(): void {
        this.rows.update(list => list.map(r => ({ ...r, unitCost: 0 })));
        this.profitabilityResults.set([]);
    }

    private recalculate(): void {
        const items = this.rows()
            .filter(r => r.unitCost > 0)
            .map(r => ({ productId: r.product.id, unitCost: r.unitCost }));

        if (items.length === 0) {
            this.profitabilityResults.set([]);
            return;
        }

        this.isProfitabilityLoading.set(true);
        this.expenseService.checkProfitability(this.businessId, items).subscribe({
            next: results => {
                this.profitabilityResults.set(results);
                this.isProfitabilityLoading.set(false);
            },
            error: () => this.isProfitabilityLoading.set(false),
        });
    }

    onImgError(event: Event): void {
        const img = event.target as HTMLImageElement;
        img.onerror = null;
        img.src = this.placeholder;
    }
}
