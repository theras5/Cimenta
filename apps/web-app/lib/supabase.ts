import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://bbydxzfxfuihwshrqxcu.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJieWR4emZ4ZnVpaHdzaHJxeGN1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjkwMDc1NDcsImV4cCI6MjA0NDU4MzU0N30.S1sRRZR_qaDv-m1jD1gRlqFkxA04f_7jsjhWYBFnfIo';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
