import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { BusinessPriceType } from '../../models/business-price-type.model';
import { BusinessPriceTypeService } from '../../services/business-price-type.service';
import { ConfirmDialogService } from '../../../../shared/services/confirm-dialog.service';

@Component({
    selector: 'app-price-types-dialog',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        MatButtonModule,
        MatIconModule,
        MatDialogModule,
        MatTooltipModule,
        MatSnackBarModule,
    ],
    templateUrl: './price-types-dialog.html',
    styleUrl: './price-types-dialog.scss',
})
export class PriceTypesDialog implements OnInit {
    private dialogRef = inject(MatDialogRef<PriceTypesDialog>);
    protected data = inject(MAT_DIALOG_DATA) as { businessId: string; role: string | null };
    private priceTypeService = inject(BusinessPriceTypeService);
    private snackBar = inject(MatSnackBar);
    private confirmDialog = inject(ConfirmDialogService);

    priceTypes = signal<BusinessPriceType[]>([]);
    editingTypeId = signal<string | null>(null);
    editingTypeName = '';
    newTypeName = '';
    isAddingType = signal(false);

    get canManage(): boolean { return this.data.role !== 'EMPLOYEE'; }

    ngOnInit(): void {
        this.priceTypeService.findAll(this.data.businessId).subscribe({
            next: types => this.priceTypes.set(types),
        });
    }

    addPriceType(): void {
        const name = this.newTypeName.trim();
        if (!name) return;
        this.priceTypeService.create(this.data.businessId, name).subscribe({
            next: t => {
                this.priceTypes.update(list => [...list, t]);
                this.newTypeName = '';
                this.isAddingType.set(false);
            },
            error: err => this.snackBar.open(err.error?.error ?? 'Error al crear tipo', 'Cerrar', { duration: 3000 }),
        });
    }

    startEditType(type: BusinessPriceType): void {
        this.editingTypeId.set(type.id);
        this.editingTypeName = type.name;
    }

    saveEditType(type: BusinessPriceType): void {
        const name = this.editingTypeName.trim();
        if (!name || name === type.name) { this.cancelEditType(); return; }
        this.priceTypeService.update(this.data.businessId, type.id, name).subscribe({
            next: updated => {
                this.priceTypes.update(list => list.map(t => t.id === updated.id ? updated : t));
                this.cancelEditType();
            },
            error: err => this.snackBar.open(err.error?.error ?? 'Error al actualizar', 'Cerrar', { duration: 3000 }),
        });
    }

    cancelEditType(): void {
        this.editingTypeId.set(null);
        this.editingTypeName = '';
    }

    deletePriceType(type: BusinessPriceType): void {
        this.confirmDialog.confirm(`¿Eliminar el tipo de precio "${type.name}"?`).subscribe(confirmed => {
            if (!confirmed) return;
            this.priceTypeService.delete(this.data.businessId, type.id).subscribe({
                next: () => this.priceTypes.update(list => list.filter(t => t.id !== type.id)),
                error: err => this.snackBar.open(err.error?.error ?? 'Error al eliminar', 'Cerrar', { duration: 3000 }),
            });
        });
    }
}
