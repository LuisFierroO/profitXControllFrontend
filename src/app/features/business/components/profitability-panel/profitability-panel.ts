import { Component, input, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ProfitabilityResult } from '../../models/expense.model';

@Component({
    selector: 'app-profitability-panel',
    standalone: true,
    imports: [CommonModule, MatIconModule, MatProgressSpinnerModule],
    templateUrl: './profitability-panel.html',
    styleUrl: './profitability-panel.scss',
})
export class ProfitabilityPanel {
    results = input<ProfitabilityResult[]>([]);
    isLoading = input(false);

    hasBadProfitability = computed(() =>
        this.results().some(r => r.verdict === 'NO_RENTABLE'));

    getProfitClass(verdict: string): string {
        if (verdict === 'BUENO') return 'profit-bueno';
        if (verdict === 'BAJO')  return 'profit-bajo';
        return 'profit-no-rentable';
    }

    getProfitLabel(verdict: string): string {
        if (verdict === 'BUENO') return 'Rentable';
        if (verdict === 'BAJO')  return 'Margen bajo';
        return 'No rentable';
    }
}
