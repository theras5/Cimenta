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

    // Validar que quantity sea un número válido
    if (typeof newPurchase.quantity !== 'number' || isNaN(newPurchase.quantity) || newPurchase.quantity <= 0) {
        throw new AppError("La cantidad debe ser un número válido mayor a cero.", 400);
    }

    // Validar que price sea un número válido si está presente
    if (newPurchase.price !== undefined && newPurchase.price !== null) {
        if (typeof newPurchase.price !== 'number' || isNaN(newPurchase.price) || newPurchase.price < 0) {
            throw new AppError("El precio debe ser un número válido mayor o igual a cero.", 400);
        }
    }

    console.log('Creando compra con datos:', JSON.stringify(newPurchase, null, 2));

    // Preparar el objeto de inserción, excluyendo campos undefined/null
    const insertData: any = {
        product: newPurchase.product,
        quantity: newPurchase.quantity,
        category: newPurchase.category,
        status: newPurchase.status || 'pending',
        site_id: newPurchase.site_id,
        user_id: newPurchase.user_id
    };

    // Agregar campos opcionales solo si tienen valor
    if (newPurchase.description) insertData.description = newPurchase.description;
    if (newPurchase.price !== undefined && newPurchase.price !== null) insertData.price = newPurchase.price;
    if (newPurchase.supplier) insertData.supplier = newPurchase.supplier;
    if (newPurchase.purchase_date) insertData.purchase_date = newPurchase.purchase_date;
    if (newPurchase.delivery_date) insertData.delivery_date = newPurchase.delivery_date;
    
    // Prioridad: siempre agregar si está presente (incluso si es 'normal' como valor por defecto)
    const priorityValue = (newPurchase as any).priority;
    if (priorityValue && ['baja', 'normal', 'alta', 'urgente'].includes(priorityValue)) {
        insertData.priority = priorityValue;
        console.log(`[createPurchaseService] Prioridad agregada: ${priorityValue}`);
    } else if (priorityValue) {
        console.warn(`[createPurchaseService] Prioridad inválida recibida: ${priorityValue}, usando 'normal' como fallback`);
        insertData.priority = 'normal';
    } else {
        console.log(`[createPurchaseService] No se recibió prioridad, usando 'normal' como valor por defecto`);
        insertData.priority = 'normal';
    }

    console.log('Datos a insertar en Supabase:', JSON.stringify(insertData, null, 2));

    const { data, error } = await supabase
        .from('purchases')
        .insert([insertData])
        .select(`
            *,
            site:site_id (
                id,
                address
            )
        `)
        .single();

    if (error) {
        console.error('Error de Supabase al crear compra:', JSON.stringify(error, null, 2));
        console.error('Código de error:', error.code);
        console.error('Detalles:', error.details);
        console.error('Hint:', error.hint);
        console.error('Datos enviados:', JSON.stringify(newPurchase, null, 2));
        throw new AppError(`Error al crear la compra: ${error.message || 'Error desconocido de Supabase'}`, 500);
    }

    return data;
}

export async function updatePurchaseByIdService(purchaseId: string, updatedPurchase: Partial<Purchase>) {
    console.log(`updatePurchaseByIdService - ID: ${purchaseId}`);
    console.log(`updatePurchaseByIdService - Datos recibidos:`, JSON.stringify(updatedPurchase, null, 2));
    
    // Obtener la compra actual para comparar el status
    const currentPurchase = await getPurchaseByIdService(purchaseId);
    const previousStatus = currentPurchase?.status;
    
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
    
    // Detectar si la compra cambió a "purchased" o "delivered" y notificar al dueño
    const newStatus = filteredPurchase.status;
    if (newStatus && (newStatus === 'purchased' || newStatus === 'delivered') && previousStatus !== newStatus && data.user_id) {
        try {
            await notifyPurchaseStatusChange(data, newStatus);
        } catch (notifyError) {
            // No fallar la actualización si la notificación falla
            console.error('Error notificando cambio de estado de compra:', notifyError);
        }
    }
    
    return data;
}

// Función para notificar cuando una compra cambia a purchased o delivered
async function notifyPurchaseStatusChange(purchase: Purchase, newStatus: Purchase['status']) {
    const { getProfileById } = await import('./profileService');
    const botUrl = process.env.WHATSAPP_BOT_URL || 'http://localhost:3001';
    
    try {
        // Obtener el perfil del dueño de la compra
        const profile = await getProfileById(purchase.user_id);
        
        if (!profile.whatsapp_jid) {
            console.log(`Usuario ${purchase.user_id} no tiene WhatsApp configurado, no se enviará notificación`);
            return;
        }
        
        // Llamar al bot para enviar la notificación
        const response = await fetch(`${botUrl}/notify/purchase-status`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                whatsappJid: profile.whatsapp_jid,
                purchaseId: purchase.id,
                product: purchase.product,
                status: newStatus,
                siteAddress: (purchase as any).site?.address || 'Obra no especificada'
            }),
        });
        
        if (!response.ok) {
            throw new Error(`Error al notificar: ${response.status} ${response.statusText}`);
        }
        
        console.log(`Notificación enviada a ${profile.whatsapp_jid} por compra ${purchase.id} cambiada a ${newStatus}`);
    } catch (error: any) {
        console.error('Error en notifyPurchaseStatusChange:', error.message);
        throw error;
    }
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
    // Obtener la compra actual para comparar el status
    const currentPurchase = await getPurchaseByIdService(purchaseId);
    const previousStatus = currentPurchase?.status;
    
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

    // Detectar si la compra cambió a "purchased" o "delivered" y notificar al dueño
    if ((status === 'purchased' || status === 'delivered') && previousStatus !== status && data.user_id) {
        try {
            await notifyPurchaseStatusChange(data, status);
        } catch (notifyError) {
            // No fallar la actualización si la notificación falla
            console.error('Error notificando cambio de estado de compra:', notifyError);
        }
    }

    return data;
};