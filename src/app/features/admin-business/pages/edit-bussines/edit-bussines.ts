import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { BusinessService } from '../../../../shared/services/business.service';

@Component({
    selector: 'app-edit-bussines',
    standalone: true,
    imports: [
        CommonModule,
        ReactiveFormsModule,
        MatCardModule,
        MatFormFieldModule,
        MatInputModule,
        MatButtonModule,
        MatIconModule,
        MatProgressSpinnerModule,
        MatSnackBarModule,
    ],
    templateUrl: './edit-bussines.html',
    styleUrl: './edit-bussines.scss',
})
export class EditBussines implements OnInit {

    private fb              = inject(FormBuilder);
    private router          = inject(Router);
    private route           = inject(ActivatedRoute);
    private businessService = inject(BusinessService);
    private snackBar        = inject(MatSnackBar);

    businessForm!: FormGroup;
    businessId!: string;

    currentImageUrl = signal<string | null>(null);
    previewUrl      = signal<string | null>(null);
    selectedFile: File | null = null;

    isLoadingData    = signal(true);
    isSavingData     = signal(false);
    isSavingImage    = signal(false);

    readonly PLACEHOLDER = 'data:image/svg+xml;base64,' + btoa(
        '<svg xmlns="http://www.w3.org/2000/svg" width="300" height="180">' +
        '<rect width="300" height="180" fill="#e0e0e0"/>' +
        '<text x="150" y="95" text-anchor="middle" font-family="sans-serif" font-size="14" fill="#9e9e9e">Sin imagen</text>' +
        '</svg>'
    );

    ngOnInit(): void {
        this.businessId = this.route.snapshot.paramMap.get('id') ?? '';

        this.businessForm = this.fb.group({
            name:        ['', Validators.required],
            description: [''],
        });

        this.businessService.getById(this.businessId).subscribe({
            next: (business) => {
                this.businessForm.patchValue({
                    name:        business.name,
                    description: business.description ?? '',
                });
                this.currentImageUrl.set(business.imgUrl ?? null);
                this.isLoadingData.set(false);
            },
            error: () => {
                this.snackBar.open('Error al cargar el negocio', 'Cerrar', { duration: 3000 });
                this.router.navigate(['/app/bussines/list']);
            },
        });
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

    removeNewImage(): void {
        this.selectedFile = null;
        this.previewUrl.set(null);
    }

    saveData(): void {
        if (this.businessForm.invalid) return;

        this.isSavingData.set(true);
        const values = this.businessForm.value;

        this.businessService.update(this.businessId, {
            name:        values.name,
            description: values.description || undefined,
        }).subscribe({
            next: () => {
                this.snackBar.open('Negocio actualizado', 'Cerrar', { duration: 3000 });
                this.isSavingData.set(false);
            },
            error: (err) => {
                const msg = err.error?.error ?? 'Error al actualizar el negocio';
                this.snackBar.open(msg, 'Cerrar', { duration: 4000 });
                this.isSavingData.set(false);
            },
        });
    }

    saveImage(): void {
        if (!this.selectedFile) return;

        this.isSavingImage.set(true);
        const form = new FormData();
        form.append('image', this.selectedFile);

        this.businessService.updateImage(this.businessId, form).subscribe({
            next: (business) => {
                this.currentImageUrl.set(business.imgUrl ?? null);
                this.previewUrl.set(null);
                this.selectedFile = null;
                this.snackBar.open('Imagen actualizada', 'Cerrar', { duration: 3000 });
                this.isSavingImage.set(false);
            },
            error: () => {
                this.snackBar.open('Error al actualizar la imagen', 'Cerrar', { duration: 3000 });
                this.isSavingImage.set(false);
            },
        });
    }

    cancel(): void {
        this.router.navigate(['/app/bussines/list']);
    }

    onImgError(event: Event): void {
        const img = event.target as HTMLImageElement;
        img.onerror = null;
        img.src = this.PLACEHOLDER;
    }
}
