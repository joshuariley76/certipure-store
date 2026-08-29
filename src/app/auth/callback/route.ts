import { NextResponse } from 'next/server'
import type { EmailOtpType } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { addSubscriberToGroup, MAILERLITE_GROUPS } from '@/lib/mailerlite'

// Supabase only honours a `redirect_to` that appears on the project's Redirect
// URL allow-list; anything else is silently swapped for the project Site URL.
// So every link we hand back to the customer is built from the one canonical
// origin (www.certipure.net) rather than whatever host this request arrived on.
function canonicalOrigin(requestOrigin: string) {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, '')
  if (!configured) return requestOrigin
  // Keep local development on localhost so the dev flow still works.
  if (requestOrigin.includes('localhost') || requestOrigin.includes('127.0.0.1')) {
    return requestOrigin
  }
  return configured
}

// Handles the link in the confirmation email. Supabase sends the user here
// either with a `?code=...` (PKCE) or a `?token_hash=...&type=...` parameter.
// We turn that into a real session (which logs the user in via cookies) and
// then forward them into the shop.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const base = canonicalOrigin(origin)

  // A bad, already-used or expired link comes back here with error parameters
  // and no code. Forward the reason so the gate can say what actually went
  // wrong and offer a fresh link. Previously this fell through to the
  // "?signin=1" branch, which told the customer their email was verified when
  // it was not, and left them with no way to get a new link.
  const errorCode = searchParams.get('error_code') || searchParams.get('error')
  if (errorCode) {
    return NextResponse.redirect(`${base}/?verify=failed&reason=${encodeURIComponent(errorCode)}`)
  }

  const code = searchParams.get('code')
  const tokenHash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtpType | null

  const supabase = await createClient()
  let verified = false

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    verified = !error
  } else if (tokenHash && type) {
    // token_hash links carry no PKCE verifier, so they still work when the
    // customer signs up on their laptop and opens the email on their phone.
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash })
    verified = !error
  }

  if (!verified) {
    // Either the link carried nothing we recognise, or the exchange failed
    // (commonly: opened on a different device from the one that signed up).
    // The email itself may well be confirmed, so the gate offers both a sign-in
    // form and a resend rather than asserting either way.
    return NextResponse.redirect(`${base}/?verify=failed&reason=link_unusable`)
  }

  // Password-recovery links point here with `?next=/auth/update-password`.
  // The exchange above signs the user in with a recovery session, so we send
  // them straight to the page where they set a new password.
  const next = searchParams.get('next')
  if (next && next.startsWith('/')) {
    return NextResponse.redirect(`${base}${next}`)
  }

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

  // Verification succeeded and the user is now signed in — drop them straight
  // onto the shop instead of the homepage gate.
  return NextResponse.redirect(`${base}/shop`)
}
