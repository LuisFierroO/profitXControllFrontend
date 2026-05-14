import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
    ReactiveFormsModule,
    FormBuilder,
    FormGroup,
    FormArray,
    Validators,
    AbstractControl,
} from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSlideToggleModule, MatSlideToggleChange } from '@angular/material/slide-toggle';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ProductService } from '../../services/product.service';
import { MatDialogRef } from '@angular/material/dialog';
import { ConfirmDialogService } from '../../../../shared/services/confirm-dialog.service';

@Component({
    selector: 'app-create-product',
    standalone: true,
    imports: [
        CommonModule,
        ReactiveFormsModule,
        MatCardModule,
        MatFormFieldModule,
        MatInputModule,
        MatButtonModule,
        MatSlideToggleModule,
        MatProgressSpinnerModule,
        MatIconModule,
        MatSnackBarModule,
        MatTooltipModule,
    ],
    templateUrl: './create-product.html',
    styleUrl: './create-product.scss'
})
export class CreateProduct implements OnInit {

    private fb = inject(FormBuilder);
    private productService = inject(ProductService);
    private snackBar = inject(MatSnackBar);
    private dialogRef = inject(MatDialogRef<CreateProduct>);
    private confirmDialog = inject(ConfirmDialogService);

    productForm!: FormGroup;
    previewUrl = signal<string | null>(null);
    selectedFile: File | null = null;
    isLoading = false;
    businessId!: string;
    firstTime = true;

    ngOnInit(): void {
        const businessId = localStorage.getItem('currentBusinessId');
        if (businessId) this.businessId = businessId;

        this.productForm = this.fb.group({
            name:         ['', Validators.required],
            description:  [''],
            purchaseCost: [0, [Validators.required, Validators.min(0)]],
            prices:       this.fb.array([this.newPriceGroup('Venta al detal')]),
            hasStock:     [false],
            initialStock: [{ value: 0, disabled: true }, Validators.min(0)],
        });

        this.dialogRef.backdropClick().subscribe(() => this.confirmClose());
        this.dialogRef.keydownEvents().subscribe(event => {
            if (event.key === 'Escape') this.confirmClose();
        });
    }

    get pricesArray(): FormArray {
        return this.productForm.get('prices') as FormArray;
    }

    priceGroup(i: number): FormGroup {
        return this.pricesArray.at(i) as FormGroup;
    }

    private newPriceGroup(name = ''): FormGroup {
        return this.fb.group({
            name:  [name, Validators.required],
            value: [null, [Validators.required, Validators.min(0)]],
        });
    }

    addPrice(): void {
        if (this.pricesArray.length >= 4) return;
        this.pricesArray.push(this.newPriceGroup());
    }

    removePrice(index: number): void {
        if (this.pricesArray.length <= 1) return;
        this.pricesArray.removeAt(index);
    }

    confirmClose(): void {
        this.confirmDialog.confirm('¿Seguro que quieres cancelar? Los cambios no se guardarán.')
            .subscribe(confirmed => { if (confirmed) this.dialogRef.close(false); });
    }

    onStockToggle(event: MatSlideToggleChange): void {
        const ctrl = this.productForm.get('initialStock');
        if (event.checked) {
            ctrl?.enable();
        } else {
            ctrl?.disable();
            ctrl?.setValue(0);
        }
    }

    onFileSelected(event: Event): void {
        const input = event.target as HTMLInputElement;
        if (!input.files?.length) return;

        const file = input.files[0];
        const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
        if (!allowedTypes.includes(file.type)) {
            this.snackBar.open('Solo se aceptan imágenes JPG, PNG o WebP', 'Cerrar', { duration: 3000 });
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

    removeImage(): void {
        this.selectedFile = null;
        this.previewUrl.set(null);
    }

    createProduct(): void {
        if (this.productForm.invalid) return;

        this.isLoading = true;
        const values = this.productForm.getRawValue();

        const prices = (values.prices as { name: string; value: number }[])
            .map(p => ({ name: p.name, value: p.value }));

        const form = new FormData();
        form.append('name', values.name);
        form.append('description', values.description || ' ');
        form.append('purchaseCost', String(values.purchaseCost ?? 0));
        form.append('prices', JSON.stringify(prices));
        form.append('hasStock', String(values.hasStock));
        form.append('initialStock', String(values.initialStock ?? 0));

        if (this.selectedFile) {
            form.append('image', this.selectedFile);
        }

        this.productService.create(this.businessId, form).subscribe({
            next: () => {
                this.snackBar.open('Producto creado correctamente', 'Cerrar', { duration: 3000 });
                this.dialogRef.close(true);
            },
            error: (err) => {
                const msg = err.error?.error ?? 'Error al crear el producto';
                this.snackBar.open(msg, 'Cerrar', { duration: 4000 });
                this.isLoading = false;
            }
        });
    }

    cancel(): void {
        this.confirmClose();
    }

    resetQuantity(): void {
        if (this.firstTime) {
            this.productForm.get('initialStock')?.setValue('');
            this.firstTime = false;
        }
    }
}
