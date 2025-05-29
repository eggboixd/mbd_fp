import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/supabase'; // We'll generate this file next

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Supabase URL and/or Anon Key are not defined in .env.local');
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);