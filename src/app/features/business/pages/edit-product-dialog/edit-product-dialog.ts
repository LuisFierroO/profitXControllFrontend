import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { ProductService } from '../../services/product.service';
import { Product } from '../../models/product.model';
import { forkJoin, of } from 'rxjs';
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
    ],
    templateUrl: './edit-product-dialog.html',
    styleUrl: './edit-product-dialog.scss',
})
export class EditProductDialog implements OnInit {

    private fb = inject(FormBuilder);
    private productService = inject(ProductService);
    private snackBar = inject(MatSnackBar);
    private dialogRef = inject(MatDialogRef<EditProductDialog>);

    data: DialogData = inject(MAT_DIALOG_DATA);

    productForm!: FormGroup;
    selectedFile: File | null = null;
    previewUrl = signal<string | null>(null);
    isLoading = false;

    readonly placeholder = 'data:image/svg+xml;base64,' + btoa(
        '<svg xmlns="http://www.w3.org/2000/svg" width="220" height="165">' +
        '<rect width="220" height="165" fill="#e0e0e0"/>' +
        '<text x="110" y="88" text-anchor="middle" font-family="sans-serif" font-size="13" fill="#9e9e9e">Sin imagen</text>' +
        '</svg>'
    );

    ngOnInit(): void {
        const p = this.data.product;

        // Pre-cargar la imagen actual como preview
        this.previewUrl.set(p.imgUrl);

        this.productForm = this.fb.group({
            name:            [p.name, Validators.required],
            description:     [p.description ?? ''],
            price:           [p.price, [Validators.required, Validators.min(0.01)]],
            stockAdjustment: [null],
        });
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

        // Paso 1: actualizar datos del producto (PATCH — JSON normal)
        const updateData: any = {
            name:        values.name,
            description: values.description,
            price:       values.price,
        };
        if (values.stockAdjustment) {
            updateData.stockAdjustment = values.stockAdjustment;
        }

        // Paso 2: si hay imagen nueva, subirla por separado (PUT multipart)
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