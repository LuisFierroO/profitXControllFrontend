import { Injectable } from '@angular/core';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export interface ExportColumn {
  key: string;
  header: string;
  format?: (value: any) => string | number;
}

export type ExportFormat = 'csv' | 'xlsx' | 'pdf';

@Injectable({ providedIn: 'root' })
export class ExportService {

  export(
    format: ExportFormat,
    filename: string,
    columns: ExportColumn[],
    data: Record<string, any>[],
    title?: string
  ): void {
    switch (format) {
      case 'csv':  return this.exportCsv(filename, columns, data);
      case 'xlsx': return this.exportXlsx(filename, columns, data);
      case 'pdf':  return this.exportPdf(filename, columns, data, title);
    }
  }

  exportCsv(filename: string, columns: ExportColumn[], data: Record<string, any>[]): void {
    const rows = data.map(row =>
      Object.fromEntries(
        columns.map(col => [col.header, col.format ? col.format(row[col.key]) : row[col.key]])
      )
    );
    const csv = Papa.unparse(rows, { header: true });
    this.download(`${filename}.csv`, new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' }));
  }

  exportXlsx(filename: string, columns: ExportColumn[], data: Record<string, any>[]): void {
    const rows = data.map(row =>
      columns.map(col => col.format ? col.format(row[col.key]) : row[col.key])
    );

    const ws = XLSX.utils.aoa_to_sheet([columns.map(c => c.header), ...rows]);

    // Column widths based on header length
    ws['!cols'] = columns.map(c => ({ wch: Math.max(c.header.length + 4, 14) }));

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Datos');
    XLSX.writeFile(wb, `${filename}.xlsx`);
  }

  exportPdf(
    filename: string,
    columns: ExportColumn[],
    data: Record<string, any>[],
    title?: string
  ): void {
    const doc = new jsPDF({ orientation: 'landscape' });

    if (title) {
      doc.setFontSize(14);
      doc.text(title, 14, 15);
    }

    const head = [columns.map(c => c.header)];
    const body = data.map(row =>
      columns.map(col => {
        const val = col.format ? col.format(row[col.key]) : row[col.key];
        return val ?? '';
      })
    );

    autoTable(doc, {
      head,
      body,
      startY: title ? 22 : 14,
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [37, 99, 235], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [245, 247, 255] },
    });

    doc.save(`${filename}.pdf`);
  }

  private download(filename: string, blob: Blob): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }
}
