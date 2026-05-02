import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { BusinessService } from '../../../../shared/services/business.service';

@Component({
    selector: 'app-create-bussines',
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
    templateUrl: './create-bussines.html',
    styleUrl: './create-bussines.scss',
})
export class CreateBussines implements OnInit {

    private fb = inject(FormBuilder);
    private router = inject(Router);
    private businessService = inject(BusinessService);
    private snackBar = inject(MatSnackBar);

    businessForm!: FormGroup;
    selectedFile: File | null = null;
    previewUrl = signal<string | null>(null);
    isLoading = false;

    ngOnInit(): void {
        this.businessForm = this.fb.group({
            name: ['', Validators.required],
            description: [''],
            nit: [''],
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

    removeImage(): void {
        this.selectedFile = null;
        this.previewUrl.set(null);
    }

    createBussines(): void {
        if (this.businessForm.invalid) return;

        this.isLoading = true;
        const values = this.businessForm.value;

        const form = new FormData();
        form.append('name', values.name);
        if (values.description) {
            form.append('description', values.description);
        }
        if (values.nit) {
            form.append('nit', values.nit);
        }
        if (this.selectedFile) {
            form.append('image', this.selectedFile);
        }

        this.businessService.create(form).subscribe({
            next: () => {
                this.snackBar.open('Negocio creado correctamente', 'Cerrar', { duration: 3000 });
                this.router.navigate(['/app/bussines/list']);
            },
            error: (err) => {
                const msg = err.error?.error ?? 'Error al crear el negocio';
                this.snackBar.open(msg, 'Cerrar', { duration: 4000 });
                this.isLoading = false;
            }
        });
    }

    cancel(): void {
        this.router.navigate(['/app/bussines/list']);
    }
}