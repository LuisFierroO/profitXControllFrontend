export interface PriceEntry {
    name: string;
    value: number;
}

export interface Product {
    id: string;
    name: string;
    description: string;
    purchaseCost: number;
    prices: PriceEntry[];
    hasStock: boolean;
    stock: number;
    imgUrl: string | null;
}
