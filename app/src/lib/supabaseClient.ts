import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Access variables from Vite's meta.env
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

let instance: SupabaseClient | null = null;

export function getSupabaseClient() {
  if (instance) return instance;
  // Soft Check: Don't kill the app, just warn the dev
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error("ENV VARS MISSING");
    return createClient('https://placeholder.supabase.co', 'placeholder');
    
    
    // Return a dummy client so the rest of the app doesn't explode
    return createClient('https://placeholder.supabase.co', 'placeholder-key');
  }

  // Real Client
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
  return instance;
}