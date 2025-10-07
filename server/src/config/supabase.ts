import { createClient, SupabaseClient} from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

console.log("Verificando variables de entorno:");
console.log("SUPABASE_URL:", process.env.SUPABASE_URL);
console.log("SUPABASE_ANON_KEY:", process.env.SUPABASE_SERVICE_ROLE_KEY ? "Definida" : "No definida");

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Las variables de entorno de Supabase no están definidas.');
}

export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseServiceKey);
