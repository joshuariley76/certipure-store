import { createClient } from '@supabase/supabase-js'

// A Supabase client that uses the SERVICE ROLE key. This bypasses Row Level
// Security, so it must ONLY ever be created/used in server-side code (API
// routes, server components) — never in the browser. Returns null if the key
// has not been configured yet, so callers can show a setup message instead of
// crashing.
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) return null
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}
