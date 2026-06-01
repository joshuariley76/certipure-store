import { createBrowserClient } from '@supabase/ssr'

// Cache a single browser client for the whole app. Calling createBrowserClient
// repeatedly (e.g. GateModal creates one on every render) spins up multiple
// Supabase auth clients that fight over the same browser auth-token lock,
// producing "lock ... was released because another request stole it" warnings.
// Returning one shared instance avoids that. The signature is unchanged, so
// every existing caller keeps working without edits.
function makeClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

let browserClient: ReturnType<typeof makeClient> | undefined

export function createClient() {
  if (!browserClient) browserClient = makeClient()
  return browserClient
}
