import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { config } from '../config.js';

// Service-role client: the worker has no user session, so all queries filter by
// user_id explicitly (obtained from the validated JWT). RLS is the backstop.
export const supabase: SupabaseClient = createClient(
  config.supabaseUrl,
  config.supabaseServiceKey,
  {
    auth: { persistSession: false, autoRefreshToken: false },
  },
);
