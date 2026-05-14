import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormArray, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ProductService } from '../../services/product.service';
import { BusinessPriceTypeService } from '../../services/business-price-type.service';
import { BusinessPriceType } from '../../models/business-price-type.model';
import { Product } from '../../models/product.model';
import { of } from 'rxjs';
import { switchMap } from 'rxjs/operators';

interface DialogData {
    product: Product;
    businessId: string;
}

@Component({
    selector: 'app-edit-product-dialog',
    standalone: true,
    imports: [
        CommonModule,
        ReactiveFormsModule,
        MatDialogModule,
        MatButtonModule,
        MatFormFieldModule,
        MatInputModule,
        MatIconModule,
        MatProgressSpinnerModule,
        MatSnackBarModule,
        MatTooltipModule,
    ],
    templateUrl: './edit-product-dialog.html',
    styleUrl: './edit-product-dialog.scss',
})
export class EditProductDialog implements OnInit {

    private fb = inject(FormBuilder);
    private productService = inject(ProductService);
    private priceTypeService = inject(BusinessPriceTypeService);
    private snackBar = inject(MatSnackBar);
    private dialogRef = inject(MatDialogRef<EditProductDialog>);

    data: DialogData = inject(MAT_DIALOG_DATA);

    productForm!: FormGroup;
    selectedFile: File | null = null;
    previewUrl = signal<string | null>(null);
    isLoading = false;
    isLoadingTypes = signal(true);
    priceTypes = signal<BusinessPriceType[]>([]);

    readonly placeholder = 'data:image/svg+xml;base64,' + btoa(
        '<svg xmlns="http://www.w3.org/2000/svg" width="220" height="165">' +
        '<rect width="220" height="165" fill="#e0e0e0"/>' +
        '<text x="110" y="88" text-anchor="middle" font-family="sans-serif" font-size="13" fill="#9e9e9e">Sin imagen</text>' +
        '</svg>'
    );

    ngOnInit(): void {
        const p = this.data.product;
        this.previewUrl.set(p.imgUrl);

        this.productForm = this.fb.group({
            name:            [p.name, Validators.required],
            description:     [p.description ?? ''],
            purchaseCost:    [p.purchaseCost ?? 0, [Validators.required, Validators.min(0)]],
            prices:          this.fb.array([]),
            stockAdjustment: [null],
        });

        this.priceTypeService.findAll(this.data.businessId).subscribe({
            next: types => {
                this.priceTypes.set(types);
                const pricesArray = this.productForm.get('prices') as FormArray;

                if (types.length > 0) {
                    // Build one entry per business price type, pre-filling from existing product prices
                    types.forEach(t => {
                        const existing = p.prices.find(pe => pe.name === t.name);
                        pricesArray.push(this.fb.group({
                            name:  [t.name],
                            value: [existing?.value ?? null, [Validators.required, Validators.min(0)]],
                        }));
                    });
                } else {
                    // Fallback: keep existing prices if no types defined
                    (p.prices ?? []).forEach(pe => {
                        pricesArray.push(this.fb.group({
                            name:  [pe.name, Validators.required],
                            value: [pe.value, [Validators.required, Validators.min(0)]],
                        }));
                    });
                    if (pricesArray.length === 0) {
                        pricesArray.push(this.fb.group({
                            name:  ['Venta al detal', Validators.required],
                            value: [null, [Validators.required, Validators.min(0)]],
                        }));
                    }
                }
                this.isLoadingTypes.set(false);
            },
            error: () => this.isLoadingTypes.set(false),
        });
    }

    get pricesArray(): FormArray {
        return this.productForm.get('prices') as FormArray;
    }

    priceGroup(i: number): FormGroup {
        return this.pricesArray.at(i) as FormGroup;
    }

    priceTypeName(i: number): string {
        return this.priceTypes()[i]?.name ?? this.priceGroup(i).get('name')?.value ?? '';
    }

    onImgError(event: Event): void {
        const img = event.target as HTMLImageElement;
        img.onerror = null;
        img.src = this.placeholder;
    }

    onFileSelected(event: Event): void {
        const input = event.target as HTMLInputElement;
        if (!input.files?.length) return;

        const file = input.files[0];
        const allowed = ['image/jpeg', 'image/png', 'image/webp'];

        if (!allowed.includes(file.type)) {
            this.snackBar.open('Solo se aceptan JPG, PNG o WebP', 'Cerrar', { duration: 3000 });
            return;
        }
        if (file.size > 5 * 1024 * 1024) {
            this.snackBar.open('La imagen no puede superar 5 MB', 'Cerrar', { duration: 3000 });
            return;
        }

        this.selectedFile = file;
        const reader = new FileReader();
        reader.onload = () => this.previewUrl.set(reader.result as string);
        reader.readAsDataURL(file);
    }

    save(): void {
        if (this.productForm.invalid) return;
        this.isLoading = true;

        const values = this.productForm.value;
        const { businessId, product } = this.data;

        const updateData: any = {
            name:         values.name,
            description:  values.description,
            purchaseCost: values.purchaseCost,
            prices:       (values.prices as { name: string; value: number }[])
                              .map(p => ({ name: p.name, value: p.value ?? 0 })),
        };
        if (values.stockAdjustment) {
            updateData.stockAdjustment = values.stockAdjustment;
        }

        this.productService.update(businessId, product.id, updateData).pipe(
            switchMap(() => {
                if (!this.selectedFile) return of(null);
                const form = new FormData();
                form.append('image', this.selectedFile);
                return this.productService.updateImage(businessId, product.id, form);
            })
        ).subscribe({
            next: () => {
                this.snackBar.open('Producto actualizado correctamente', 'Cerrar', { duration: 3000 });
                this.dialogRef.close(true);
            },
            error: (err) => {
                const msg = err.error?.error ?? 'Error al actualizar el producto';
                this.snackBar.open(msg, 'Cerrar', { duration: 4000 });
                this.isLoading = false;
            }
        });
    }
}
