import { Component, inject, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { SaleService } from '../../services/sale.service';
import { SaleResponse } from '../../models/sale.model';

interface EditableItem {
    productId: string;
    productName: string;
    unitPrice: number;
    quantity: number;
    originalQuantity: number;
}

interface DialogData {
    sale: SaleResponse;
    businessId: string;
}

@Component({
    selector: 'app-edit-sale-dialog',
    standalone: true,
    imports: [
        CommonModule,
        MatDialogModule,
        MatButtonModule,
        MatIconModule,
        MatDividerModule,
        MatProgressSpinnerModule,
        MatTooltipModule,
        MatSnackBarModule,
    ],
    templateUrl: './edit-sale-dialog.html',
    styleUrl: './edit-sale-dialog.scss',
})
export class EditSaleDialog implements OnInit {

    private saleService = inject(SaleService);
    private snackBar = inject(MatSnackBar);
    private dialogRef = inject(MatDialogRef<EditSaleDialog>);

    data: DialogData = inject(MAT_DIALOG_DATA);

    items: EditableItem[] = [];
    isLoading = false;

    ngOnInit(): void {
        // Copia profunda para no mutar el objeto original mientras editas
        this.items = this.data.sale.items.map(item => ({
            productId:        item.productId,
            productName:      item.productName,
            unitPrice:        item.unitPrice,
            quantity:         item.quantity,
            originalQuantity: item.quantity,
        }));
    }

    get newTotal(): number {
        return this.items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);
    }

    hasChanges(): boolean {
        if (this.items.length !== this.data.sale.items.length) return true;
        return this.items.some(i => i.quantity !== i.originalQuantity);
    }

    increase(index: number): void {
        this.items[index].quantity++;
        this.items = [...this.items];
    }

    decrease(index: number): void {
        if (this.items[index].quantity > 1) {
            this.items[index].quantity--;
            this.items = [...this.items];
        }
    }

    removeItem(index: number): void {
        this.items = this.items.filter((_, i) => i !== index);
    }

    save(): void {
        if (!this.hasChanges()) return;
        this.isLoading = true;

        const payload = {
            items: this.items.map(i => ({
                productId: i.productId,
                quantity:  i.quantity,
            }))
        };

        this.saleService.update(this.data.businessId, this.data.sale.id, payload).subscribe({
            next: () => {
                this.snackBar.open('Venta actualizada correctamente', 'Cerrar', { duration: 3000 });
                this.dialogRef.close(true);
            },
            error: (err) => {
                const msg = err.error?.error ?? 'Error al actualizar la venta';
                this.snackBar.open(msg, 'Cerrar', { duration: 4000 });
                this.isLoading = false;
            }
        });
    }
}