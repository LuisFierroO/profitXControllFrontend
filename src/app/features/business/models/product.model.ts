export interface Product {
    id: string;
    name: string;
    description: string;
    price: number;
    hasStock: boolean;
    stock: number;
    imgUrl: string | null;
}
