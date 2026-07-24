import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { resolveCode } from '@/lib/affiliate'

// Checks a promo/affiliate code for the signed-in customer so the checkout form
// can show the discounted total *before* they send payment. Display-only —
// /api/create-order runs the same checks again and is authoritative.
export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ valid: false, reason: 'Please sign in first.' }, { status: 401 })
  }

  let code = ''
  try {
    const body = await request.json()
    code = typeof body?.code === 'string' ? body.code : ''
  } catch {
    return NextResponse.json({ valid: false, reason: 'Invalid request.' }, { status: 400 })
  }

  const admin = createAdminClient()
  const resolved = await resolveCode(code, admin)

  if (!resolved) {
    return NextResponse.json({ valid: false, reason: "That code isn't valid." })
  }

  // Legacy welcome code: first order only.
  if (resolved.kind === 'legacy') {
    const { count } = await supabase
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
    if ((count ?? 0) > 0) {
      return NextResponse.json({ valid: false, reason: 'This code is valid on your first order only.' })
    }
    return NextResponse.json({ valid: true, code: resolved.code, percent: resolved.percent })
  }

  // Affiliate code: valid every time the customer enters it.
  return NextResponse.json({ valid: true, code: resolved.affiliate.code, percent: resolved.affiliate.discount_percent })
}
