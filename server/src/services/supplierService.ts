import { supabase } from "../config/supabase";
import { AppError } from "../errors/AppError";

export async function getSuppliersService() {
    const { data, error } = await supabase.from("suppliers").select('*');

    if (error) {
        throw new AppError(error.message, 500);
    }
    return data;
}