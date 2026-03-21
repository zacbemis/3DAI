import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

let cached: SupabaseClient | null = null;

/** Resolve API key from env (prefer service role on the server — bypasses RLS). */
function resolveSupabaseKey(): string | undefined {
  return (
    process.env.SUPABASE_SECRET?.trim()
  );
}

/**
 * Server-side Supabase client.
 * Set in `.env`:
 * - `SUPABASE_URL` — Project URL (Settings → API)
 * - Prefer `SUPABASE_SERVICE_ROLE_KEY` on this API (bypasses RLS). **Never** expose it to the browser.
 * - Or `SUPABASE_ANON_KEY` — RLS applies; empty reads usually mean missing policies.
 * - Also supported: `SUPABASE_KEY` / `SUPABASE_SECRET` (same as above, project-specific naming).
 */
export function getSupabase(): SupabaseClient | null {
  const url = process.env.SUPABASE_URL?.trim();
  const key = resolveSupabaseKey();

  if (!url || !key) {
    return null;
  }

  if (!cached) {
    cached = createClient(url, key, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
      db: {
        schema: 'public',
      },
    });
  }

  return cached;
}

/** True when URL + key are present (client can be created). */
export function isSupabaseConfigured(): boolean {
  return getSupabase() !== null;
}
