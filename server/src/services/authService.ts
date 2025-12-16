import { supabase } from "../config/supabase";
import { AppError } from "../errors/AppError";

export async function signInWithPasswordService(email: string, password: string, name: string) {
    if (!email || !password || !name) {
        throw new AppError("Email, contraseña y nombre son requeridos.", 400);
    }
    
    // Validar longitud mínima del nombre (el constraint de la BD requiere al menos 2 caracteres)
    if (name.trim().length < 2) {
        throw new AppError("El nombre debe tener al menos 2 caracteres.", 400);
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

    // NO crear el perfil aquí - se crea en el controlador usando createProfile()
    // Esto evita duplicación y errores de constraint

    return data;
}

export async function logInWithPasswordService(email: string, password: string) {
    if (!email || !password) {
        throw new AppError("Email y contraseña son requeridos.", 400);
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

