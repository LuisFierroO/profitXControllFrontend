export interface SaleItemResponse {
    productId: string;
    productName: string;
    quantity: number;
    unitPrice: number;
    subtotal: number;
}

export interface SaleResponse {
    id: string;
    date: string;
    total: number;
    businessId: string;
    items: SaleItemResponse[];
    amountPaid?: number;
    change?: number;
}
