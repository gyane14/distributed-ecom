export interface Product {
    id: number;
    name: string;
    description?: string;
    price: number;
    stock: number;
}

export interface ServiceResponse<T> {
    success: boolean;
    data?: T;
    error?: string;
}