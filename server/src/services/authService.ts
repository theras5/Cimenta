import { supabase } from "../config/supabase";
import { AppError } from "../errors/AppError";

export async function signInWithPasswordService(email: string, password: string, name: string) {
    if (!email || !password || !name) {
        throw new AppError("Email, contraseña y nombre son requeridos.", 400);
    }

    const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
            data: {
                name: name,
            }
        }
    });

    if (error) {
        console.log("Error de Supabase en registro:", error.message);
        throw new AppError(error.message, 400);
    }

    // Insertar en la tabla profiles
    if (data.user) {
        const { error: profileError } = await supabase
            .from('profiles')
            .insert({
                id: data.user.id,
                name: name,
                email: email,
            });

        if (profileError) {
            console.log("Error al crear perfil:", profileError.message);
            // No lanzamos error para no bloquear el registro
        }
    }

    return data;
}

export async function logInWithPasswordService(email: string, password: string) {
    if (!email || !password) {
        throw new AppError("Email, contraseña y nombre son requeridos.", 400);
    }

    const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
    });

    if (error) {
        throw new AppError(error.message, 401);
    }

    return data;
}

// export async function getProfileByPhone(phone: string) {
//     if (!phone) {
//         throw new AppError("", 400);
//     }

//     const { data, error } = await supabase
//         .from("profiles")
//         .select("*")
//         .eq("phone", phone)
//         .single();

//     if (error) {
//         throw new AppError(error.message, 500);
//     }

//     return data;
// }