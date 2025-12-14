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
    console.log('📦 createPurchaseService - Datos recibidos:', JSON.stringify(newPurchase, null, 2));
    
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

    // Prioridad: siempre agregar si está presente (incluso si es 'normal' como valor por defecto)
    const priorityValue = (newPurchase as any).priority;
    let finalPriority = 'normal';
    if (priorityValue && ['baja', 'normal', 'alta', 'urgente'].includes(priorityValue)) {
        finalPriority = priorityValue;
        console.log(`[createPurchaseService] Prioridad agregada: ${priorityValue}`);
    } else if (priorityValue) {
        console.warn(`[createPurchaseService] Prioridad inválida recibida: ${priorityValue}, usando 'normal' como fallback`);
    } else {
        console.log(`[createPurchaseService] No se recibió prioridad, usando 'normal' como valor por defecto`);
    }

    const purchaseData = {
        product: newPurchase.product,
        description: newPurchase.description,
        quantity: newPurchase.quantity,
        unity: newPurchase.unity,
        price: newPurchase.price,
        supplier: newPurchase.supplier,
        category: newPurchase.category,
        priority: finalPriority,
        status: newPurchase.status || 'pending',
        purchase_date: newPurchase.purchase_date,
        delivery_date: newPurchase.delivery_date,
        site_id: newPurchase.site_id,
        user_id: newPurchase.user_id
    };

    console.log('📦 Insertando en Supabase:', JSON.stringify(purchaseData, null, 2));

    const { data, error } = await supabase
    .from('purchases')
    .insert([purchaseData])
        .select(`
            *,
            site:site_id (
                id,
                address
            )
        `)
        .single();

    if (error) {
        console.error('❌ Error de Supabase:', error);
        console.error('Error de Supabase al crear compra:', JSON.stringify(error, null, 2));
        if (error.code) console.error('Código de error:', error.code);
        if (error.details) console.error('Detalles:', error.details);
        if (error.hint) console.error('Hint:', error.hint);
        console.error('Datos enviados:', JSON.stringify(newPurchase, null, 2));
        throw new AppError(`Error al crear la compra: ${error.message || 'Error desconocido de Supabase'}`, 500);
    }

    console.log('✅ Compra creada exitosamente:', data);
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
        unity: updatedPurchase.unity,
        price: updatedPurchase.price,
        supplier: updatedPurchase.supplier,
        category: updatedPurchase.category,
        priority: updatedPurchase.priority,
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

export const uploadPurchaseImageService = async (
    purchaseId: string, 
    imageData: string
) => {
    try {
        console.log(`📸 uploadPurchaseImageService - purchaseId: ${purchaseId}`);
        
        // Verificar que la compra existe
        const { data: purchase, error: purchaseError } = await supabase
            .from('purchases')
            .select('id')
            .eq('id', purchaseId)
            .single();

        if (purchaseError || !purchase) {
            throw new AppError(`Compra con id ${purchaseId} no encontrada`, 404);
        }

        // Extraer el base64 del data URL
        const base64Match = imageData.match(/^data:image\/(jpeg|jpg|png|gif);base64,(.+)$/);
        if (!base64Match) {
            throw new AppError('Formato de imagen inválido. Debe ser base64 con data URL', 400);
        }

        const imageFormat = base64Match[1];
        const base64Data = base64Match[2];
        
        // Convertir base64 a Buffer
        const imageBuffer = Buffer.from(base64Data, 'base64');
        
        // Generar nombre único para la imagen
        const timestamp = Date.now();
        const fileName = `purchase_${purchaseId}_${timestamp}.${imageFormat}`;
        const filePath = `purchases/${purchaseId}/${fileName}`;

        console.log(`📤 Subiendo imagen a Supabase Storage: ${filePath}`);

        // Subir a Supabase Storage
        const { data: uploadData, error: uploadError } = await supabase.storage
            .from('purchase_images')
            .upload(filePath, imageBuffer, {
                contentType: `image/${imageFormat}`,
                upsert: false
            });

        if (uploadError) {
            console.error('❌ Error al subir a Storage:', uploadError);
            throw new AppError(`Error al subir imagen: ${uploadError.message}`, 500);
        }

        console.log(`✅ Imagen subida a Storage exitosamente`);

        // Obtener URL pública
        const { data: publicUrlData } = supabase.storage
            .from('purchase_images')
            .getPublicUrl(filePath);

        const imageUrl = publicUrlData.publicUrl;

        console.log(`🔗 URL pública generada: ${imageUrl}`);

        // Guardar referencia en purchase_images (sin id, Supabase lo genera automáticamente)
        const { data: imageRecord, error: dbError } = await supabase
            .from('purchase_images')
            .insert([{
                purchase_id: purchaseId,
                image_url: imageUrl
            }])
            .select()
            .single();

        if (dbError) {
            console.error('❌ Error al guardar en purchase_images:', dbError);
            // Intentar eliminar la imagen del storage si falla la BD
            await supabase.storage.from('purchase_images').remove([filePath]);
            throw new AppError(`Error al guardar referencia de imagen: ${dbError.message}`, 500);
        }

        console.log(`✅ Referencia guardada en purchase_images:`, imageRecord);
        return imageRecord;

    } catch (error) {
        console.error('❌ Error en uploadPurchaseImageService:', error);
        throw error;
    }
};

export const getPurchaseImagesService = async (purchaseId: string) => {
    try {
        const { data, error } = await supabase
            .from('purchase_images')
            .select('*')
            .eq('purchase_id', purchaseId);

        if (error) {
            throw new AppError(error.message, 500);
        }

        return data || [];
    } catch (error) {
        console.error('❌ Error en getPurchaseImagesService:', error);
        throw error;
    }
};