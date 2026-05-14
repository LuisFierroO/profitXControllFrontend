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
import { BusinessPriceTypeService } from '../../services/business-price-type.service';
import { Product } from '../../models/product.model';
import { BusinessPriceType } from '../../models/business-price-type.model';
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
    private priceTypeService = inject(BusinessPriceTypeService);

    businessId!: string;

    rows = signal<ProductCostRow[]>([]);
    isLoadingProducts = signal(true);
    priceTypes = signal<BusinessPriceType[]>([]);
    selectedPriceType = signal<string>('');

    searchControl = new FormControl('');

    readonly placeholder = 'data:image/svg+xml;base64,' + btoa(
        '<svg xmlns="http://www.w3.org/2000/svg" width="44" height="44">' +
        '<rect width="44" height="44" fill="#e0e0e0"/>' +
        '</svg>'
    );

    filteredRows = computed(() => {
        const term = this.searchControl.value?.toLowerCase().trim() ?? '';
        return this.rows().filter(r =>
            !term || r.product.name.toLowerCase().includes(term));
    });

    profitabilityResults = computed<ProfitabilityResult[]>(() => {
        const typeName = this.selectedPriceType();
        if (!typeName) return [];
        return this.filteredRows().map(r => {
            const priceEntry = r.product.prices.find(p => p.name === typeName);
            const salePrice = priceEntry?.value ?? 0;
            const cost = r.unitCost;
            const grossProfit = salePrice - cost;
            const margin = salePrice > 0 ? (grossProfit / salePrice) * 100 : -100;
            const markup = cost > 0 ? (grossProfit / cost) * 100 : 0;
            const profitable = grossProfit > 0;
            let verdict: string;
            if      (margin >= 30) verdict = 'BUENO';
            else if (margin >= 10) verdict = 'BAJO';
            else                   verdict = 'NO_RENTABLE';
            return {
                productId: r.product.id,
                productName: r.product.name,
                salePrice,
                unitCost: cost,
                grossProfitPerUnit: grossProfit,
                marginPercent: margin,
                markupPercent: markup,
                profitable,
                verdict,
            };
        });
    });

    activeCount = computed(() => this.filteredRows().filter(r => r.unitCost > 0).length);

    ngOnInit(): void {
        const id = localStorage.getItem('currentBusinessId');
        if (!id) return;
        this.businessId = id;

        this.productService.findByBusiness(this.businessId).subscribe({
            next: products => {
                this.rows.set(products.map(p => ({ product: p, unitCost: p.purchaseCost ?? 0 })));
                this.isLoadingProducts.set(false);
            },
            error: () => this.isLoadingProducts.set(false),
        });

        this.priceTypeService.findAll(this.businessId).subscribe({
            next: types => {
                this.priceTypes.set(types);
                if (types.length > 0) this.selectedPriceType.set(types[0].name);
            },
        });
    }

    selectPriceType(name: string): void {
        this.selectedPriceType.set(name);
    }

    updateCost(productId: string, value: number): void {
        this.rows.update(list =>
            list.map(r =>
                r.product.id === productId
                    ? { ...r, unitCost: Math.max(0, value || 0) }
                    : r
            )
        );
    }

    resetCosts(): void {
        this.rows.update(list => list.map(r => ({ ...r, unitCost: r.product.purchaseCost ?? 0 })));
    }

    priceForSelected(product: Product): number {
        const name = this.selectedPriceType();
        return product.prices.find(p => p.name === name)?.value ?? 0;
    }

    onImgError(event: Event): void {
        const img = event.target as HTMLImageElement;
        img.onerror = null;
        img.src = this.placeholder;
    }
}
