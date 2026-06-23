import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { addSubscriberToGroup, MAILERLITE_GROUPS } from '@/lib/mailerlite'

// Handles the link in the confirmation email. Supabase sends the user here
// with a `?code=...` parameter. We exchange that code for a real session
// (which logs the user in via cookies) and then send them to the homepage.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      // The account is now confirmed and signed in. Add them to the MailerLite
      // "Customers" group, which is what triggers the welcome email (with the
      // 10%-off offer). This is best-effort: a MailerLite hiccup must never
      // block the customer from getting into the shop, so we swallow errors.
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (user?.email && MAILERLITE_GROUPS.customers) {
          const meta = (user.user_metadata ?? {}) as { first_name?: string; last_name?: string }
          const result = await addSubscriberToGroup({
            email: user.email,
            groupId: MAILERLITE_GROUPS.customers,
            fields: { name: meta.first_name ?? '', last_name: meta.last_name ?? '' },
          })
          if (!result.ok) {
            console.error('MailerLite sync failed:', result.status, result.error)
          }
        }
      } catch (e) {
        console.error('MailerLite sync threw:', e)
      }

      // Verification succeeded and the user is now signed in — drop them
      // straight onto the shop instead of the homepage gate.
      return NextResponse.redirect(`${origin}/shop`)
    }
  }

  // No code, or the exchange failed — send them to the homepage with the
  // `?signin=1` flag, which tells the gate to open on the SIGN IN form (not
  // the default sign-up form) so a just-verified user can log straight in.
  return NextResponse.redirect(`${origin}/?signin=1`)
}
