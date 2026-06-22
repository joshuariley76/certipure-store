import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { codeMatches, DISCOUNT_CODE, DISCOUNT_PERCENT } from '@/lib/discount'

// Checks a promo code for the signed-in customer so the checkout form can show
// them the discounted total *before* they send payment. This is a convenience
// check for display only — /api/create-order runs the same checks again and is
// the authoritative calculation that actually gets stored.
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

  if (!codeMatches(code)) {
    return NextResponse.json({ valid: false, reason: "That code isn't valid." })
  }

  // First order only: reject if this customer already has any order on record.
  const { count } = await supabase
    .from('orders')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)

  if ((count ?? 0) > 0) {
    return NextResponse.json({ valid: false, reason: 'This code is valid on your first order only.' })
  }

  return NextResponse.json({ valid: true, code: DISCOUNT_CODE, percent: DISCOUNT_PERCENT })
}
