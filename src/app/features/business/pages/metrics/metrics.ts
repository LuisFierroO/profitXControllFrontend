import { Component, inject, OnInit, signal, ViewChild, ElementRef, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MetricsService } from '../../services/metrics.service';
import { Summary, TimeSeriesPoint, TopProduct, ExpenseBreakdown, StockAlert, AlertLevel } from '../../models/metrics.model';
import { forkJoin } from 'rxjs';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

@Component({
    selector: 'app-metrics',
    standalone: true,
    imports: [
        CommonModule,
        ReactiveFormsModule,
        MatButtonModule,
        MatButtonToggleModule,
        MatCardModule,
        MatFormFieldModule,
        MatInputModule,
        MatIconModule,
        MatDatepickerModule,
        MatNativeDateModule,
        MatProgressSpinnerModule,
        MatTooltipModule,
        MatSnackBarModule,
    ],
    templateUrl: './metrics.html',
    styleUrl: './metrics.scss',
})
export class Metrics implements OnInit {

    private metricsService = inject(MetricsService);
    private snackBar = inject(MatSnackBar);

    @ViewChild('chartCanvas') chartCanvas?: ElementRef<HTMLCanvasElement>;
    private chart?: Chart;

    businessId!: string;

    isLoading        = signal(true);
    summary          = signal<Summary | null>(null);
    timeSeriesData   = signal<TimeSeriesPoint[]>([]);
    topProducts      = signal<TopProduct[]>([]);
    expenseBreakdown = signal<ExpenseBreakdown[]>([]);
    stockAlerts      = signal<StockAlert[]>([]);
    topProductsSort  = signal<'quantity' | 'revenue'>('quantity');

    dateFrom = new FormControl<Date | null>(null);
    dateTo   = new FormControl<Date | null>(null);

    readonly placeholder = 'data:image/svg+xml;base64,' + btoa(
        '<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48">' +
        '<rect width="48" height="48" fill="#e0e0e0"/>' +
        '<text x="50%" y="55%" text-anchor="middle" fill="#bbb" font-size="20">?</text>' +
        '</svg>'
    );

    constructor() {
        effect(() => {
            const data = this.timeSeriesData();
            if (data.length > 0) {
                setTimeout(() => this.renderChart());
            }
        });
    }

    ngOnInit(): void {
        const id = localStorage.getItem('currentBusinessId');
        if (!id) return;
        this.businessId = id;
        this.loadAllMetrics();
        this.dateFrom.valueChanges.subscribe(() => this.loadAllMetrics());
        this.dateTo.valueChanges.subscribe(() => this.loadAllMetrics());
    }

    private loadAllMetrics(): void {
        this.isLoading.set(true);
        const from = this.dateFrom.value || undefined;
        const to   = this.dateTo.value   || undefined;
        const sort = this.topProductsSort();

        forkJoin({
            summary:     this.metricsService.getSummary(this.businessId, from, to),
            timeseries:  this.metricsService.getTimeSeries(this.businessId, from, to),
            topProducts: this.metricsService.getTopProducts(this.businessId, from, to, 5, sort),
            breakdown:   this.metricsService.getExpenseBreakdown(this.businessId, from, to),
            alerts:      this.metricsService.getStockAlerts(this.businessId),
        }).subscribe({
            next: (data) => {
                this.summary.set(data.summary);
                this.timeSeriesData.set(data.timeseries);
                this.topProducts.set(data.topProducts);
                this.expenseBreakdown.set(data.breakdown);
                this.stockAlerts.set(data.alerts);
                this.isLoading.set(false);
            },
            error: () => {
                this.snackBar.open('Error al cargar las métricas', 'Cerrar', { duration: 3000 });
                this.isLoading.set(false);
            }
        });
    }

    resetDates(): void {
        this.dateFrom.setValue(null);
        this.dateTo.setValue(null);
    }

    setTopProductsSort(sort: 'quantity' | 'revenue'): void {
        this.topProductsSort.set(sort);
        this.loadAllMetrics();
    }

    get profitMargin(): number {
        const s = this.summary();
        if (!s || s.totalRevenue === 0) return 0;
        return (s.netProfit / s.totalRevenue) * 100;
    }

    get simpleExpensePercent(): number {
        const items = this.expenseBreakdown();
        const total = items.reduce((sum, e) => sum + e.total, 0);
        if (total === 0) return 50;
        const simple = items.find(e => e.type === 'SIMPLE')?.total ?? 0;
        return (simple / total) * 100;
    }

    getExpensePercent(item: ExpenseBreakdown): number {
        const total = this.expenseBreakdown().reduce((sum, e) => sum + e.total, 0);
        return total === 0 ? 0 : (item.total / total) * 100;
    }

    getProductBarWidth(product: TopProduct): number {
        const max = this.topProducts()[0]?.totalRevenue ?? 0;
        return max === 0 ? 0 : (product.totalRevenue / max) * 100;
    }

    getAlertLabel(level: AlertLevel): string {
        const labels: Record<AlertLevel, string> = {
            OUT_OF_STOCK: 'Agotado',
            LOW_STOCK:    'Stock bajo',
            NO_MOVEMENT:  'Sin movimiento',
        };
        return labels[level];
    }

    // ── Chart.js ──────────────────────────────────────────────────────────────

    private renderChart(): void {
        if (!this.chartCanvas) return;
        const data = this.timeSeriesData();
        if (data.length === 0) return;

        if (this.chart) this.chart.destroy();

        const ctx = this.chartCanvas.nativeElement.getContext('2d');
        if (!ctx) return;

        const gradRevenue = ctx.createLinearGradient(0, 0, 0, 300);
        gradRevenue.addColorStop(0, 'rgba(46,125,50,0.25)');
        gradRevenue.addColorStop(1, 'rgba(46,125,50,0)');

        const gradExpenses = ctx.createLinearGradient(0, 0, 0, 300);
        gradExpenses.addColorStop(0, 'rgba(198,40,40,0.2)');
        gradExpenses.addColorStop(1, 'rgba(198,40,40,0)');

        const labels   = data.map(p => new Date(p.date).toLocaleDateString('es-CO', { day: '2-digit', month: 'short' }));
        const revenues = data.map(p => p.revenue);
        const expenses = data.map(p => p.expenses);

        this.chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels,
                datasets: [
                    {
                        label: 'Ingresos',
                        data: revenues,
                        borderColor: '#2e7d32',
                        backgroundColor: gradRevenue,
                        tension: 0.4,
                        fill: true,
                        pointRadius: 4,
                        pointBackgroundColor: '#2e7d32',
                        pointBorderColor: '#fff',
                        pointBorderWidth: 2,
                        borderWidth: 2.5,
                    },
                    {
                        label: 'Gastos',
                        data: expenses,
                        borderColor: '#c62828',
                        backgroundColor: gradExpenses,
                        tension: 0.4,
                        fill: true,
                        pointRadius: 4,
                        pointBackgroundColor: '#c62828',
                        pointBorderColor: '#fff',
                        pointBorderWidth: 2,
                        borderWidth: 2.5,
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                interaction: { mode: 'index', intersect: false },
                plugins: {
                    legend: {
                        position: 'top',
                        labels: {
                            font: { size: 13 },
                            usePointStyle: true,
                            pointStyleWidth: 10,
                            padding: 20,
                        }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(20,20,20,0.88)',
                        padding: 12,
                        cornerRadius: 8,
                        titleFont: { size: 12 },
                        bodyFont: { size: 13 },
                        callbacks: {
                            label: (ctx) => ` ${ctx.dataset.label}: ${this.formatCurrency(ctx.parsed.y ?? 0)}`
                        }
                    }
                },
                scales: {
                    x: {
                        grid: { display: false },
                        border: { display: false },
                        ticks: { font: { size: 11 }, maxRotation: 45, color: '#999' }
                    },
                    y: {
                        beginAtZero: true,
                        grid: { color: 'rgba(0,0,0,0.05)' },
                        border: { display: false },
                        ticks: {
                            callback: (value) => this.formatCurrency(Number(value)),
                            font: { size: 11 },
                            color: '#999',
                        }
                    }
                }
            }
        });
    }

    private formatCurrency(value: number): string {
        return '$' + Math.round(value).toLocaleString('es-CO');
    }

    // ── Alert helpers ─────────────────────────────────────────────────────────

    getAlertClass(level: AlertLevel): string {
        const map: Record<AlertLevel, string> = {
            OUT_OF_STOCK: 'out-of-stock',
            LOW_STOCK:    'low-stock',
            NO_MOVEMENT:  'no-movement',
        };
        return map[level];
    }

    getAlertIcon(level: AlertLevel): string {
        const map: Record<AlertLevel, string> = {
            OUT_OF_STOCK: 'remove_shopping_cart',
            LOW_STOCK:    'warning_amber',
            NO_MOVEMENT:  'hourglass_empty',
        };
        return map[level];
    }

    getAlertMessage(alert: StockAlert): string {
        switch (alert.level) {
            case 'OUT_OF_STOCK': return 'Sin stock disponible';
            case 'LOW_STOCK':    return `Solo quedan ${alert.currentStock} unidades`;
            case 'NO_MOVEMENT':  return alert.daysWithoutMovement
                ? `Sin ventas hace ${alert.daysWithoutMovement} días`
                : 'Sin ventas recientes';
            default: return '';
        }
    }

    onImgError(event: Event): void {
        const img = event.target as HTMLImageElement;
        img.onerror = null;
        img.src = this.placeholder;
    }
}
