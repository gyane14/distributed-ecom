export interface Product {
    id: number;
    name: string;
    description?: string;
    price: number;
    stock: number;
}

export interface OrderItems {
    productId: number;
    quantity: number;
    productPrice: number;
}

export enum OrderStatus {
    PENDING = 'PENDING',
    PROCESSING = 'PROCESSING',
    SHIPPED = 'SHIPPED',
    DELIVERED = 'DELIVERED',
    CANCELLED = 'CANCELLED' 
}

export interface Order {
    id: number;
    userID: string;
    products: OrderItems[];
    totalAmount: number;
    status: OrderStatus;
    createdAt: Date;
}

export interface User {
    id: number;
    name: string;
    email: string;
    address: string;
}


export interface ServiceResponse<T> {
    success: boolean;
    data?: T;
    error?: string;
}