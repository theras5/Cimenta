import { supabase } from "../config/supabase";
import { AppError } from "../errors/AppError";

export async function signInWithPasswordService(email: string, password: string, name: string) {
    if (!email || !password) {
        throw new AppError("Email y contraseña son requeridos.", 400);
    }

    const { data, error } = await supabase.auth.signUp({
        email,
        password,
    });

    if (error) {
        console.log("Error de Supabase en registro:", error.message);
        throw new AppError(error.message, 400);
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

