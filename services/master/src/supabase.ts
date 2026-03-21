import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

let cached: SupabaseClient | null = null;

/**
 * Server-side Supabase client.
 * Set in `.env`:
 * - `SUPABASE_URL` — Project URL (Settings → API)
 * - `SUPABASE_SERVICE_ROLE_KEY` — for trusted backend only (bypasses RLS), **never** expose to clients
 *   OR `SUPABASE_ANON_KEY` — respects RLS (use with policies suited to server use)
 */
export function getSupabase(): SupabaseClient | null {
  const url = process.env.SUPABASE_URL?.trim();
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ??
    process.env.SUPABASE_ANON_KEY?.trim();

  if (!url || !key) {
    return null;
  }

  if (!cached) {
    cached = createClient(url, key, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }

  return cached;
}

/** True when URL + key are present (client can be created). */
export function isSupabaseConfigured(): boolean {
  return getSupabase() !== null;
}
