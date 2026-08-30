import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Anon-key client for the public auth pages (research #2): token_hash is the
// credential, the anon key is sufficient — the service key must never reach a
// browser-loaded page. SUPABASE_URL/SUPABASE_ANON_KEY are inlined by
// scripts/build-auth.mjs (esbuild define); backend config.ts is not importable
// here because it pulls node:os into the browser bundle.
export function createAnonClient(): SupabaseClient {
  return createClient(
    process.env.SUPABASE_URL ?? '',
    process.env.SUPABASE_ANON_KEY ?? '',
    {
      auth: { persistSession: false, autoRefreshToken: false },
    },
  );
}