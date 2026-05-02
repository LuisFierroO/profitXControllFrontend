import { Component, ElementRef, EventEmitter, Output, ViewChild } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-import-button',
  standalone: true,
  imports: [MatButtonModule, MatIconModule],
  template: `
    <button mat-stroked-button class="import-btn" (click)="fileInput.click()">
      <mat-icon>upload_file</mat-icon>
      Importar
    </button>
    <input #fileInput type="file" accept=".csv,.xlsx" hidden (change)="onFileChange($event)">
  `,
  styles: [`.import-btn { display: flex; align-items: center; gap: 2px; white-space: nowrap; }`],
})
export class ImportButton {
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;
  @Output() fileSelected = new EventEmitter<File>();

  onFileChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file  = input.files?.[0];
    if (file) this.fileSelected.emit(file);
    input.value = ''; // reset so same file can be selected again
  }
}
