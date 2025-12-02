export interface Purchase {
    id: string;
    user_id: string;
    site_id: string;
    product: string;
    description?: string;
    quantity: number;
    unity?: string;
    price?: number;
    supplier?: string;
    category: string;
    priority?: string;
    status: 'pending' | 'purchased' | 'delivered'
    purchase_date?: string;
    delivery_date?: string;
}

export interface CreatePurchaseDTO {
    product: string;
    description?: string;
    quantity: number;
    unity?: string;
    price?: number;
    supplier?: string;
    category: string;
    priority?: string;
    status: 'pending' | 'purchased' | 'delivered'
    purchase_date?: string;
    delivery_date?: string;
}