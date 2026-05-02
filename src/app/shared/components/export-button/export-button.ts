import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ExportFormat } from '../../services/export.service';

@Component({
  selector: 'app-export-button',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule, MatMenuModule, MatTooltipModule],
  templateUrl: './export-button.html',
  styleUrl: './export-button.scss',
})
export class ExportButton {
  @Input() disabled = false;
  @Output() exportSelected = new EventEmitter<ExportFormat>();

  select(format: ExportFormat): void {
    this.exportSelected.emit(format);
  }
}
