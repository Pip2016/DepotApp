import { createClient as createSupabaseClient, type SupabaseClient } from '@supabase/supabase-js';

// Nur serverseitig für Cron-Jobs: der Service-Role-Key umgeht RLS.
// stock_fundamentals erlaubt Schreiben sonst nur angemeldeten Nutzern.
export function createAdminClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createSupabaseClient(url, key, { auth: { persistSession: false } });
}
