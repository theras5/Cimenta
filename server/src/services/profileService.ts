import { supabase } from "../config/supabase";
import { AppError } from "../errors/AppError";

export async function createProfile(userUid: string, name: string) {
    if (!userUid || !name) {
        throw new AppError("Se necesita un userUid y nombre para poder crear un profile", 400);
    }

    const { data, error } = await supabase
        .from("profiles")
        .insert({ id: userUid, name });

    if (error) throw new AppError(error.message, 500);

    return data;
}

export async function getProfileByPhone(whatsappJid: string) {
    if (!whatsappJid) {
        throw new AppError("Se necesita un número de teléfono para obtener un perfil", 400);
    }

    const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("whatsapp_jid", whatsappJid)
        .single();

    if (error) throw new AppError(error.message, 500);

    return data;
}