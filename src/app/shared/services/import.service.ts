import { Injectable } from '@angular/core';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { Product } from '../../features/business/models/product.model';
import { CreateExpenseRequest } from '../../features/business/models/expense.model';

// ── Public shapes ──────────────────────────────────────────────────────────────

export interface ProductImportRow {
  name: string;
  description: string;
  price: number;
  hasStock: boolean;
  initialStock: number;
}

export interface SaleImportGroup {
  /** Human-readable label for the preview table */
  label: string;
  items: { productId: string; quantity: number }[];
  amountPaid?: number;
}

export interface ImportValidation<T> {
  valid: T[];
  errors: string[];
}

// ── Column name constants (must match the template headers) ───────────────────

const PRODUCT_COLS = {
  name:         'Nombre',
  description:  'Descripción',
  price:        'Precio',
  hasStock:     'Maneja Stock',
  initialStock: 'Stock Inicial',
};

const SALE_COLS = {
  group:      'Venta #',
  product:    'Nombre Producto',
  quantity:   'Cantidad',
  amountPaid: 'Pago Recibido',
};

const EXPENSE_COLS = {
  description: 'Descripción',
  amount:      'Monto',
  type:        'Tipo',
  product:     'Nombre Producto',
  quantity:    'Cantidad',
  unitCost:    'Costo Unitario',
};

@Injectable({ providedIn: 'root' })
export class ImportService {

  // ── File parsing ─────────────────────────────────────────────────────────────

  readFile(file: File): Promise<Record<string, any>[]> {
    const ext = file.name.split('.').pop()?.toLowerCase();
    return ext === 'csv' ? this.parseCsv(file) : this.parseXlsx(file);
  }

  private parseCsv(file: File): Promise<Record<string, any>[]> {
    return new Promise((resolve, reject) => {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: r => resolve(r.data as Record<string, any>[]),
        error:    e => reject(e),
      });
    });
  }

  private parseXlsx(file: File): Promise<Record<string, any>[]> {
    return file.arrayBuffer().then(buf => {
      const wb = XLSX.read(new Uint8Array(buf), { type: 'array' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      return XLSX.utils.sheet_to_json<Record<string, any>>(ws, { defval: '' });
    });
  }

  // ── Validation ────────────────────────────────────────────────────────────────

  validateProductRows(rows: Record<string, any>[]): ImportValidation<ProductImportRow> {
    const valid: ProductImportRow[] = [];
    const errors: string[] = [];

    rows.forEach((row, i) => {
      const line = i + 2; // +2: header row + 1-indexed
      const name  = String(row[PRODUCT_COLS.name] ?? '').trim();
      const price = parseFloat(String(row[PRODUCT_COLS.price] ?? '').replace(/[^0-9.]/g, ''));

      if (!name)       { errors.push(`Fila ${line}: "Nombre" es obligatorio`);               return; }
      if (isNaN(price) || price < 0) { errors.push(`Fila ${line}: "Precio" debe ser un número positivo`); return; }

      const hasStockRaw = String(row[PRODUCT_COLS.hasStock] ?? '').trim().toLowerCase();
      const hasStock    = hasStockRaw === 'sí' || hasStockRaw === 'si' || hasStockRaw === 'true' || hasStockRaw === '1';
      const stockRaw    = parseInt(String(row[PRODUCT_COLS.initialStock] ?? '0'), 10);
      const initialStock = isNaN(stockRaw) ? 0 : Math.max(0, stockRaw);

      valid.push({
        name,
        description:  String(row[PRODUCT_COLS.description] ?? '').trim(),
        price,
        hasStock,
        initialStock: hasStock ? initialStock : 0,
      });
    });

    return { valid, errors };
  }

  validateSaleRows(
    rows: Record<string, any>[],
    products: Product[]
  ): ImportValidation<SaleImportGroup> {
    const errors: string[] = [];
    const groups = new Map<string, SaleImportGroup>();
    let autoKey = 0;

    rows.forEach((row, i) => {
      const line        = i + 2;
      const productName = String(row[SALE_COLS.product] ?? '').trim();
      const qtyRaw      = parseInt(String(row[SALE_COLS.quantity] ?? ''), 10);
      const groupKey    = String(row[SALE_COLS.group] ?? '').trim() || `__auto_${++autoKey}`;

      if (!productName) { errors.push(`Fila ${line}: "Nombre Producto" es obligatorio`); return; }
      if (isNaN(qtyRaw) || qtyRaw <= 0) { errors.push(`Fila ${line}: "Cantidad" debe ser un entero positivo`); return; }

      const match = products.find(p => p.name.toLowerCase() === productName.toLowerCase());
      if (!match) { errors.push(`Fila ${line}: Producto "${productName}" no encontrado en este negocio`); return; }

      if (!groups.has(groupKey)) {
        const rawPaid = String(row[SALE_COLS.amountPaid] ?? '').trim().replace(/[^0-9.]/g, '');
        let amountPaid: number | undefined;
        if (rawPaid) {
          const parsed = parseFloat(rawPaid);
          if (isNaN(parsed) || parsed <= 0) {
            errors.push(`Fila ${line}: "Pago Recibido" debe ser un número positivo`);
            return;
          }
          amountPaid = parsed;
        }
        groups.set(groupKey, {
          label: groupKey.startsWith('__auto_') ? `Venta individual` : `Venta #${groupKey}`,
          items: [],
          amountPaid,
        });
      }
      groups.get(groupKey)!.items.push({ productId: match.id, quantity: qtyRaw });
    });

    return { valid: Array.from(groups.values()), errors };
  }

  validateExpenseRows(
    rows: Record<string, any>[],
    products: Product[]
  ): ImportValidation<CreateExpenseRequest> {
    const valid: CreateExpenseRequest[] = [];
    const errors: string[] = [];

    rows.forEach((row, i) => {
      const line        = i + 2;
      const description = String(row[EXPENSE_COLS.description] ?? '').trim();
      const typeRaw     = String(row[EXPENSE_COLS.type] ?? '').trim().toUpperCase();
      const type        = typeRaw === 'INVENTORY' ? 'INVENTORY' : 'SIMPLE';

      if (!description) { errors.push(`Fila ${line}: "Descripción" es obligatoria`); return; }

      if (type === 'SIMPLE') {
        const amount = parseFloat(String(row[EXPENSE_COLS.amount] ?? '').replace(/[^0-9.]/g, ''));
        if (isNaN(amount) || amount <= 0) { errors.push(`Fila ${line}: "Monto" debe ser un número positivo`); return; }
        valid.push({ description, type: 'SIMPLE', amount });
      } else {
        const productName = String(row[EXPENSE_COLS.product] ?? '').trim();
        const qty         = parseInt(String(row[EXPENSE_COLS.quantity] ?? ''), 10);
        const unitCost    = parseFloat(String(row[EXPENSE_COLS.unitCost] ?? '').replace(/[^0-9.]/g, ''));

        if (!productName) { errors.push(`Fila ${line}: "Nombre Producto" obligatorio para tipo INVENTORY`); return; }
        if (isNaN(qty) || qty <= 0) { errors.push(`Fila ${line}: "Cantidad" debe ser un entero positivo`); return; }
        if (isNaN(unitCost) || unitCost <= 0) { errors.push(`Fila ${line}: "Costo Unitario" debe ser un número positivo`); return; }

        const match = products.find(p => p.name.toLowerCase() === productName.toLowerCase());
        if (!match) { errors.push(`Fila ${line}: Producto "${productName}" no encontrado en este negocio`); return; }
        if (match.hasStock && match.stock < qty) {
          errors.push(`Fila ${line}: Stock insuficiente para "${productName}" (disponible: ${match.stock})`);
          return;
        }

        valid.push({
          description,
          type: 'INVENTORY',
          inventoryItems: [{ productId: match.id, quantity: qty, unitCost }],
        });
      }
    });

    return { valid, errors };
  }

  // ── Template download ──────────────────────────────────────────────────────────

  downloadTemplate(type: 'products' | 'sales' | 'expenses'): void {
    const config: { filename: string; headers: string[]; sample: string[][] } = {
      products: {
        filename: 'plantilla_productos',
        headers:  Object.values(PRODUCT_COLS),
        sample: [
          ['Camiseta azul', 'Talla M', '25000', 'Sí', '100'],
          ['Pantalón negro', 'Talla 32', '45000', 'No', '0'],
        ],
      },
      sales: {
        filename: 'plantilla_ventas',
        headers:  Object.values(SALE_COLS),
        sample: [
          ['1', 'Camiseta azul',  '2', '50000'],
          ['1', 'Pantalón negro', '1', ''],
          ['2', 'Camiseta azul',  '3', ''],
          ['',  'Pantalón negro', '5', '15000'],
        ],
      },
      expenses: {
        filename: 'plantilla_gastos',
        headers:  Object.values(EXPENSE_COLS),
        sample: [
          ['Pago de servicios', '150000', 'SIMPLE', '', '', ''],
          ['Compra de inventario', '', 'INVENTORY', 'Camiseta azul', '50', '12000'],
        ],
      },
    }[type];

    const ws = XLSX.utils.aoa_to_sheet([config.headers, ...config.sample]);
    ws['!cols'] = config.headers.map(h => ({ wch: Math.max(h.length + 4, 16) }));

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Plantilla');
    XLSX.writeFile(wb, `${config.filename}.xlsx`);
  }
}
