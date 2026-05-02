import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { ImportService } from '../../services/import.service';

export interface ImportPreviewDialogData {
  title: string;
  templateType: 'products' | 'sales' | 'expenses';
  validCount: number;
  errors: string[];
  previewColumns: { key: string; label: string }[];
  previewRows: Record<string, any>[];
}

@Component({
  selector: 'app-import-preview-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule, MatIconModule],
  templateUrl: './import-preview-dialog.html',
  styleUrl: './import-preview-dialog.scss',
})
export class ImportPreviewDialog {
  data     = inject<ImportPreviewDialogData>(MAT_DIALOG_DATA);
  dialogRef = inject(MatDialogRef<ImportPreviewDialog>);
  private importService = inject(ImportService);

  readonly MAX_PREVIEW = 8;

  get shownErrors(): string[]  { return this.data.errors.slice(0, 10); }
  get extraErrors(): number    { return Math.max(0, this.data.errors.length - 10); }
  get previewRows(): Record<string, any>[] { return this.data.previewRows.slice(0, this.MAX_PREVIEW); }

  downloadTemplate(): void { this.importService.downloadTemplate(this.data.templateType); }
  cancel(): void  { this.dialogRef.close(false); }
  confirm(): void { this.dialogRef.close(true); }
}
