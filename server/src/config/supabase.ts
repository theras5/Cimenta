import { createClient, SupabaseClient} from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

console.log("🔍 Verificando variables de entorno:");
console.log("SUPABASE_URL:", process.env.SUPABASE_URL);
console.log("SUPABASE_ANON_KEY:", process.env.SUPABASE_ANON_KEY ? "✅ Definida" : "❌ No definida");

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Las variables de entorno de Supabase no están definidas.');
}

export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey);
console.log("Cliente Supabase creado:", supabase ? "✅ OK" : "❌ Error");