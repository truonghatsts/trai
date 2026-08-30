// Build-time config (inlined by esbuild `define`; see build.mjs).
export const CONFIG = {
  SUPABASE_URL: process.env.SUPABASE_URL ?? '',
  SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY ?? '',
  BACKEND_URL: process.env.BACKEND_URL ?? 'http://localhost:3000',
};
