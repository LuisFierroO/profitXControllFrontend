export interface Summary {
    totalRevenue: number;
    totalExpenses: number;
    netProfit: number;
    averageTicket: number;
    salesCount: number;
    expensesCount: number;
}

export interface TimeSeriesPoint {
    date: string;
    revenue: number;
    expenses: number;
}

export interface TopProduct {
    productId: string;
    productName: string;
    imgUrl: string | null;
    totalQuantity: number;
    totalRevenue: number;
}

export interface ExpenseBreakdown {
    type: 'SIMPLE' | 'INVENTORY';
    total: number;
    count: number;
}

export type AlertLevel = 'OUT_OF_STOCK' | 'LOW_STOCK' | 'NO_MOVEMENT';

export interface StockAlert {
    productId: string;
    productName: string;
    imgUrl: string | null;
    currentStock: number;
    level: AlertLevel;
    daysWithoutMovement: number | null;
}

export interface PriceTypeProfit {
    priceTypeName: string;
    totalRevenue: number;
    totalCost: number;
    grossProfit: number;
    marginPercent: number;
    itemCount: number;
}
