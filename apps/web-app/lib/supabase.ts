import { createClient } from '@supabase/supabase-js';

// IMPORTANTE: Usar la misma URL que el servidor
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://nvtuykidiftxjvbmouug.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im52dHV5a2lkaWZ0eGp2Ym1vdXVnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU4NzE5MTMsImV4cCI6MjA3MTQ0NzkxM30.YOUR_ANON_KEY_HERE';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
