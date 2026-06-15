import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

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
      // Verification succeeded and the user is now signed in.
      return NextResponse.redirect(`${origin}/`)
    }
  }

  // No code, or the exchange failed — send them to the homepage, where the
  // sign-in gate will prompt them to log in and try again.
  return NextResponse.redirect(`${origin}/`)
}
