import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { ProductService } from '../../services/product.service';
import { Product } from '../../models/product.model';
import { SaleService } from '../../services/sale.service';
import { debounceTime } from 'rxjs';

interface CartItem {
    product: Product;
    quantity: number;
}

@Component({
    selector: 'app-sale',
    standalone: true,
    imports: [
        CommonModule,
        CurrencyPipe,
        ReactiveFormsModule,
        MatCardModule,
        MatFormFieldModule,
        MatInputModule,
        MatButtonModule,
        MatIconModule,
        MatDividerModule,
        MatProgressSpinnerModule,
        MatSnackBarModule,
    ],
    templateUrl: './sale.html',
    styleUrl: './sale.scss'
})
export class Sale implements OnInit {

    private productService = inject(ProductService);
    private saleService = inject(SaleService);
    private snackBar = inject(MatSnackBar);

    businessId!: string;
    allProducts = signal<Product[]>([]);
    filteredProducts = signal<Product[]>([]);
    cartItems: CartItem[] = [];
    searchControl = new FormControl('');
    paymentControl = new FormControl<number | null>(null);
    isLoading = false;

    get payment(): number | null {
        const v = this.paymentControl.value;
        return v != null && v > 0 ? v : null;
    }

    get change(): number | null {
        const p = this.payment;
        return p != null && p >= this.total ? p - this.total : null;
    }

    get insufficientPayment(): boolean {
        const p = this.payment;
        return p != null && p < this.total;
    }

    readonly placeholder = 'data:image/svg+xml;base64,' + btoa(
        '<svg xmlns="http://www.w3.org/2000/svg" width="165" height="132">' +
        '<rect width="165" height="132" fill="#e0e0e0"/>' +
        '<text x="82" y="71" text-anchor="middle" font-family="sans-serif" font-size="13" fill="#9e9e9e">Sin imagen</text>' +
        '</svg>'
    );

    ngOnInit(): void {
        const id = localStorage.getItem('currentBusinessId');
        if (!id) {
            this.snackBar.open('No se encontro el negocio', 'Cerrar', { duration: 3000 });
            return;
        }
        this.businessId = id;
        this.loadProducts();

        this.searchControl.valueChanges
            .pipe(debounceTime(250))
            .subscribe(term => this.filterProducts(term ?? ''));
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

    addToCart(product: Product): void {
        if (product.hasStock && product.stock === 0) return;

        const existing = this.cartItems.find(i => i.product.id === product.id);
        if (existing) {
            if (product.hasStock && existing.quantity >= product.stock) {
                this.snackBar.open(
                    'Solo hay ' + product.stock + ' unidades de ' + product.name,
                    'Cerrar', { duration: 3000 });
                return;
            }
            existing.quantity++;
        } else {
            this.cartItems = [...this.cartItems, { product, quantity: 1 }];
        }
    }

    increaseQuantity(productId: string): void {
        const item = this.cartItems.find(i => i.product.id === productId);
        if (!item) return;
        if (item.product.hasStock && item.quantity >= item.product.stock) return;
        item.quantity++;
        this.cartItems = [...this.cartItems];
    }

    decreaseQuantity(productId: string): void {
        const item = this.cartItems.find(i => i.product.id === productId);
        if (!item) return;
        if (item.quantity > 1) {
            item.quantity--;
            this.cartItems = [...this.cartItems];
        } else {
            this.removeFromCart(productId);
        }
    }

    setQuantity(productId: string, event: Event): void {
        const input = event.target as HTMLInputElement;
        const item = this.cartItems.find(i => i.product.id === productId);
        if (!item) return;

        let value = parseInt(input.value, 10);

        if (isNaN(value) || value < 1) {
            value = 1;
        }

        if (item.product.hasStock && value > item.product.stock) {
            value = item.product.stock;
            this.snackBar.open(
                'Solo hay ' + item.product.stock + ' unidades de ' + item.product.name,
                'Cerrar', { duration: 3000 }
            );
        }

        item.quantity = value;
        input.value = String(value);
        this.cartItems = [...this.cartItems];
    }

    removeFromCart(productId: string): void {
        this.cartItems = this.cartItems.filter(i => i.product.id !== productId);
    }

    clearCart(): void {
        this.cartItems = [];
    }

    getCartQuantity(productId: string): number {
        return this.cartItems.find(i => i.product.id === productId)?.quantity ?? 0;
    }

    get total(): number {
        return this.cartItems.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
    }

    confirmSale(): void {
        if (this.cartItems.length === 0) return;
        this.isLoading = true;

        const payload: { items: { productId: string; quantity: number }[]; amountPaid?: number } = {
            items: this.cartItems.map(item => ({
                productId: item.product.id,
                quantity: item.quantity
            }))
        };

        if (this.payment != null) {
            payload.amountPaid = this.payment;
        }

        this.saleService.create(this.businessId, payload).subscribe({
            next: () => {
                this.snackBar.open('Venta registrada correctamente', 'Cerrar', { duration: 3000 });
                this.cartItems = [];
                this.paymentControl.setValue(null);
                this.loadProducts();
                this.isLoading = false;
            },
            error: (err) => {
                const msg = err.error?.error ?? 'Error al registrar la venta';
                this.snackBar.open(msg, 'Cerrar', { duration: 4000 });
                this.isLoading = false;
            }
        });
    }
}