import { supabase } from "../config/supabase";
import { AppError } from "../errors/AppError";
import { Purchase, CreatePurchaseDTO } from "packages/dtos/src/types/purchase.dto";

export async function getAllPurchasesService() {
    const { data, error } = await supabase.from("purchases").select(`
            *,
            site:site_id (
                id,
                address
            )
        `)
        .order('created_at', { ascending: false });

    if (error) {
        throw new AppError(error.message, 500);
    }
    return data;
}

export async function getPurchaseByIdService(purchaseId: string) {
    const { data, error } = await supabase
        .from('purchases')
        .select(`
            *,
            site:site_id (
                id,
                address
        )
        `)
        .eq('id', purchaseId)
        .single();

    if (error) {
        throw new AppError(error.message, 500);
    }

    return data;
}

export async function createPurchaseService(newPurchase: CreatePurchaseDTO & { user_id: string, site_id: string }) {
    if (!newPurchase.product || !newPurchase.category || !newPurchase.quantity) {
        throw new AppError("Producto, categoría y cantidad son campos obligatorios.", 400);
    }

    const { data, error } = await supabase
        .from('purchases')
        .insert([{
            product: newPurchase.product,
            description: newPurchase.description,
            quantity: newPurchase.quantity,
            price: newPurchase.price,
            supplier: newPurchase.supplier,
            category: newPurchase.category,
            status: newPurchase.status || 'pending',
            purchase_date: newPurchase.purchase_date,
            delivery_date: newPurchase.delivery_date,
            site_id: newPurchase.site_id,
            user_id: newPurchase.user_id
        }])
        .select(`
            *,
            site:site_id (
                id,
                address
            )
        `)
        .single();

    if (error) {
        throw new AppError(error.message, 500);
    }

    return data;
}

export async function updatePurchaseByIdService(purchaseId: string, updatedPurchase: Partial<Purchase>) {
    console.log(`updatePurchaseByIdService - ID: ${purchaseId}`);
    console.log(`updatePurchaseByIdService - Datos recibidos:`, JSON.stringify(updatedPurchase, null, 2));
    
    // Filtrar campos que existen en la tabla de la base de datos
    const allowedFields = {
        product: updatedPurchase.product,
        description: updatedPurchase.description,
        quantity: updatedPurchase.quantity,
        price: updatedPurchase.price,
        supplier: updatedPurchase.supplier,
        category: updatedPurchase.category,
        status: updatedPurchase.status,
        purchase_date: updatedPurchase.purchase_date,
        delivery_date: updatedPurchase.delivery_date,
        site_id: updatedPurchase.site_id,
        user_id: updatedPurchase.user_id
    };

    // Remover campos undefined/null/empty strings
    const filteredPurchase = Object.fromEntries(
        Object.entries(allowedFields).filter(([_, value]) => 
            value !== undefined && 
            value !== null && 
            value !== ""
        )
    );

    console.log(`updatePurchaseByIdService - Datos filtrados:`, JSON.stringify(filteredPurchase, null, 2));

    const { data, error } = await supabase
        .from("purchases")
        .update(filteredPurchase)
        .eq("id", purchaseId)
        .select(`
            *,
            site:site_id (
                id,
                address
            )
        `)
        .single();

    if (error) {
        console.error(`updatePurchaseByIdService - Error de Supabase:`, error);
        throw new AppError(error.message, 500);
    }

    if (!data) {
        console.error(`updatePurchaseByIdService - No se encontró la compra`);
        throw new AppError(`No se encontró la compra con el id ${purchaseId}`, 404);
    }

    console.log(`updatePurchaseByIdService - Compra actualizada:`, JSON.stringify(data, null, 2));
    return data;
}

export async function deletePurchaseByIdService(purchaseId: string) {
    const { error } = await supabase
        .from("purchases")
        .delete()
        .eq("id", purchaseId);

    if (error) {
        throw new AppError(error.message, 500);
    }
}

export const getPurchasesBySiteService = async (siteId: string) => {
    const { data, error } = await supabase
        .from('purchases')
        .select(`
            *,
            site:site_id (
                id,
                address
            )
        `)
        .eq('site_id', siteId)
        .order('created_at', { ascending: false });
    
    if (error) {
        throw new AppError(error.message, 500);
    }
    return data;
};

export const getPurchasesByStatusService = async (status: Purchase['status']) => {
    const { data, error } = await supabase
        .from('purchases')
        .select(`
            *,
            site:site_id (
                id,
                address
            )
        `)
        .eq('status', status)
        .order('created_at', { ascending: false });
    
    if (error) {
        throw new AppError(error.message, 500);
    }
    return data;
};

export const getPurchasesByUserService = async (userId: string) => {
    const { data, error } = await supabase
        .from('purchases')
        .select(`
            *,
            site:site_id (
                id,
                address
            )
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
    
    if (error) {
        throw new AppError(error.message, 500);
    }
    return data;
};

export const updatePurchaseStatusService = async (purchaseId: string, status: Purchase['status']) => {
    const { data, error } = await supabase
        .from('purchases')
        .update({ status })
        .eq('id', purchaseId)
        .select(`
            *,
            site:site_id (
                id,
                address
            )
        `)
        .single();

    if (error) {
        throw new AppError(error.message, 500);
    }

    if (!data) {
        throw new AppError(`No se encontró la compra con el id ${purchaseId}`, 404);
    }

    return data;
};