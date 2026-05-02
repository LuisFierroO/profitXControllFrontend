export type ExpenseType = 'SIMPLE' | 'INVENTORY';

export interface PurchasedItem {
    productId: string;
    productName: string;
    quantity: number;
    unitCost: number;
    subtotal: number;
    stockAfter: number;
}

export interface ExpenseResponse {
    id: string;
    description: string;
    amount: number;
    date: string;
    type: ExpenseType;
    businessId: string;
    purchasedItems: PurchasedItem[] | null;
}

export interface CreateExpenseRequest {
    description: string;
    type: ExpenseType;
    amount?: number;
    inventoryItems?: {
        productId: string;
        quantity: number;
        unitCost: number;
    }[];
}

export interface ProfitabilityResult {
    productId: string;
    productName: string;
    salePrice: number;
    unitCost: number;
    grossProfitPerUnit: number;
    marginPercent: number;
    markupPercent: number;
    profitable: boolean;
    verdict: 'BUENO' | 'BAJO' | 'NO_RENTABLE';
}

export interface UpdateExpenseRequest {
    description: string;
    amount?: number;
    inventoryItems?: {
        productId: string;
        quantity: number;
        unitCost: number;
    }[];
}
