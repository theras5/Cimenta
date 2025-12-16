import { supabase } from "../config/supabase";
import { AppError } from "../errors/AppError";

export async function createProfile(userUid: string, name: string, email: string) {
    if (!userUid || !name || !email) {
        throw new AppError("Se necesita un userUid, nombre y email para poder crear un profile", 400);
    }
    
    // Validar longitud mínima del nombre (el constraint de la BD requiere al menos 2 caracteres)
    if (name.trim().length < 2) {
        throw new AppError("El nombre debe tener al menos 2 caracteres.", 400);
    }

    // Usar upsert en lugar de insert para evitar errores si el perfil ya existe
    const { data, error } = await supabase
        .from("profiles")
        .upsert({ id: userUid, name: name.trim(), email }, { onConflict: 'id' });

    if (error) {
        console.error("Error al crear/actualizar perfil:", error);
        throw new AppError(error.message, 500);
    }

    return data;
}

export async function getProfileByPhone(whatsappJid: string) {
    if (!whatsappJid) {
        throw new AppError("Se necesita un número de teléfono para obtener un perfil", 400);
    }

    // Normalizar el whatsapp_jid: convertir @c.us y @lid a @s.whatsapp.net para consistencia
    // WhatsApp puede enviar números con @c.us, @lid o @s.whatsapp.net, pero en la BD guardamos @s.whatsapp.net
    let normalizedJid = whatsappJid.trim();
    // Reemplazar @c.us y @lid por @s.whatsapp.net
    if (normalizedJid.endsWith('@c.us') || normalizedJid.endsWith('@lid')) {
        normalizedJid = normalizedJid.replace(/@(c\.us|lid)$/, '@s.whatsapp.net');
    }
    
    console.log(`[getProfileByPhone] Buscando perfil con whatsapp_jid original: "${whatsappJid}"`);
    console.log(`[getProfileByPhone] whatsapp_jid normalizado: "${normalizedJid}"`);

    // Intentar primero con el JID normalizado
    let { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("whatsapp_jid", normalizedJid)
        .maybeSingle();

    // Si no se encuentra, intentar con el JID original (por si acaso)
    if (!data && !error && normalizedJid !== whatsappJid) {
        console.log(`[getProfileByPhone] No se encontró con JID normalizado, intentando con original...`);
        const result = await supabase
            .from("profiles")
            .select("*")
            .eq("whatsapp_jid", whatsappJid)
            .maybeSingle();
        data = result.data;
        error = result.error;
    }

    if (error) {
        console.error(`[getProfileByPhone] Error obteniendo perfil por whatsapp_jid "${whatsappJid}":`, error);
        throw new AppError(error.message, 500);
    }

    if (!data) {
        console.log(`[getProfileByPhone] No se encontró perfil para whatsapp_jid: "${whatsappJid}" (normalizado: "${normalizedJid}")`);
        // Verificar si hay perfiles similares para debugging
        const { data: allProfiles } = await supabase
            .from("profiles")
            .select("whatsapp_jid")
            .not("whatsapp_jid", "is", null);
        console.log(`[getProfileByPhone] Perfiles disponibles en la BD:`, allProfiles?.map(p => p.whatsapp_jid));
    } else {
        console.log(`[getProfileByPhone] ✅ Perfil encontrado: ${data.name} (${data.id})`);
    }

    // maybeSingle() devuelve null si no encuentra resultados, no lanza error
    return data;
}

export async function getProfileById(userId: string) {
    if (!userId) {
        throw new AppError("Se necesita un user_id para obtener un perfil", 400);
    }

    const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

    if (error) throw new AppError(error.message, 500);

    return data;
}

export async function updateProfileWhatsappJid(userId: string, whatsappJid: string) {
    if (!userId || !whatsappJid) {
        throw new AppError("Se necesita un user_id y whatsapp_jid para actualizar el perfil", 400);
    }

    // Normalizar el whatsapp_jid
    let normalizedJid = whatsappJid.trim();
    if (normalizedJid.endsWith('@c.us') || normalizedJid.endsWith('@lid')) {
        normalizedJid = normalizedJid.replace(/@(c\.us|lid)$/, '@s.whatsapp.net');
    }

    const { data, error } = await supabase
        .from("profiles")
        .update({ whatsapp_jid: normalizedJid })
        .eq("id", userId)
        .select()
        .single();

    if (error) {
        console.error(`Error actualizando whatsapp_jid para usuario ${userId}:`, error);
        throw new AppError(error.message, 500);
    }

    console.log(`✅ whatsapp_jid actualizado para usuario ${userId}: ${normalizedJid}`);
    return data;
}

// Función helper para agregar un whatsapp_jid a un perfil existente o crear uno nuevo
export async function addWhatsappJidToProfile(whatsappJid: string, name?: string) {
    if (!whatsappJid) {
        throw new AppError("Se necesita un whatsapp_jid", 400);
    }

    // Normalizar el whatsapp_jid
    let normalizedJid = whatsappJid.trim();
    if (normalizedJid.endsWith('@c.us') || normalizedJid.endsWith('@lid')) {
        normalizedJid = normalizedJid.replace(/@(c\.us|lid)$/, '@s.whatsapp.net');
    }

    // Verificar si ya existe un perfil con ese whatsapp_jid
    const existingProfile = await getProfileByPhone(normalizedJid);
    if (existingProfile) {
        console.log(`⚠️ Ya existe un perfil con whatsapp_jid ${normalizedJid}: ${existingProfile.name} (${existingProfile.id})`);
        return existingProfile;
    }

    // Buscar un perfil sin whatsapp_jid para actualizar
    const { data: profilesWithoutJid, error: searchError } = await supabase
        .from("profiles")
        .select("*")
        .or("whatsapp_jid.is.null,whatsapp_jid.eq.")
        .limit(1);

    if (searchError) {
        console.error("Error buscando perfiles sin whatsapp_jid:", searchError);
    }

    // Si hay un perfil sin whatsapp_jid, actualizarlo
    if (profilesWithoutJid && profilesWithoutJid.length > 0) {
        const profileToUpdate = profilesWithoutJid[0];
        console.log(`Actualizando perfil existente ${profileToUpdate.id} con whatsapp_jid ${normalizedJid}`);
        return await updateProfileWhatsappJid(profileToUpdate.id, normalizedJid);
    }

    // Si no hay perfiles sin whatsapp_jid, crear uno nuevo
    // Necesitamos generar un UUID para el id
    const { randomUUID } = await import('crypto');
    const newUserId = randomUUID();
    const profileName = name || `Usuario ${normalizedJid.split('@')[0]}`;

    console.log(`Creando nuevo perfil para whatsapp_jid ${normalizedJid}`);
    const { data: newProfile, error: createError } = await supabase
        .from("profiles")
        .insert({ 
            id: newUserId, 
            name: profileName,
            whatsapp_jid: normalizedJid 
        })
        .select()
        .single();

    if (createError) {
        console.error("Error creando nuevo perfil:", createError);
        throw new AppError(createError.message, 500);
    }

    console.log(`✅ Nuevo perfil creado: ${newProfile.name} (${newProfile.id}) con whatsapp_jid ${normalizedJid}`);
    return newProfile;
}