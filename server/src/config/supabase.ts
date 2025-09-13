import { createClient, SupabaseClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Las variables de entorno de Supabase no están definidas.');
}

// Opcionalmente, puedes asignar explícitamente el tipo SupabaseClient
export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey);