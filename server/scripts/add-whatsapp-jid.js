// Script para agregar un whatsapp_jid a la base de datos
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Error: SUPABASE_URL y SUPABASE_ANON_KEY deben estar configurados en .env');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function addWhatsappJid(whatsappJid, name) {
    // Normalizar el whatsapp_jid
    let normalizedJid = whatsappJid.trim();
    if (normalizedJid.endsWith('@c.us') || normalizedJid.endsWith('@lid')) {
        normalizedJid = normalizedJid.replace(/@(c\.us|lid)$/, '@s.whatsapp.net');
    }

    console.log(`📱 Agregando whatsapp_jid: ${normalizedJid}`);

    // Verificar si ya existe
    const { data: existing } = await supabase
        .from('profiles')
        .select('*')
        .eq('whatsapp_jid', normalizedJid)
        .maybeSingle();

    if (existing) {
        console.log(`✅ Ya existe un perfil con ese whatsapp_jid: ${existing.name} (${existing.id})`);
        return existing;
    }

    // Buscar un perfil sin whatsapp_jid para actualizar
    const { data: profilesWithoutJid } = await supabase
        .from('profiles')
        .select('*')
        .or('whatsapp_jid.is.null,whatsapp_jid.eq.')
        .limit(1);

    if (profilesWithoutJid && profilesWithoutJid.length > 0) {
        const profileToUpdate = profilesWithoutJid[0];
        console.log(`📝 Actualizando perfil existente: ${profileToUpdate.name} (${profileToUpdate.id})`);
        
        const { data: updated, error } = await supabase
            .from('profiles')
            .update({ whatsapp_jid: normalizedJid })
            .eq('id', profileToUpdate.id)
            .select()
            .single();

        if (error) {
            console.error('❌ Error actualizando perfil:', error);
            throw error;
        }

        console.log(`✅ Perfil actualizado exitosamente`);
        return updated;
    }

    // Crear un nuevo perfil
    const { randomUUID } = require('crypto');
    const newUserId = randomUUID();
    const profileName = name || `Usuario ${normalizedJid.split('@')[0]}`;

    console.log(`🆕 Creando nuevo perfil: ${profileName}`);

    const { data: newProfile, error } = await supabase
        .from('profiles')
        .insert({
            id: newUserId,
            name: profileName,
            whatsapp_jid: normalizedJid
        })
        .select()
        .single();

    if (error) {
        console.error('❌ Error creando perfil:', error);
        throw error;
    }

    console.log(`✅ Nuevo perfil creado: ${newProfile.name} (${newProfile.id})`);
    return newProfile;
}

// Ejecutar el script
const whatsappJid = process.argv[2] || '57161736548553@lid';
const name = process.argv[3] || 'Usuario 57161736548553';

addWhatsappJid(whatsappJid, name)
    .then(profile => {
        console.log('\n✅ Proceso completado exitosamente!');
        console.log('Perfil:', JSON.stringify(profile, null, 2));
        process.exit(0);
    })
    .catch(error => {
        console.error('\n❌ Error:', error.message);
        process.exit(1);
    });

