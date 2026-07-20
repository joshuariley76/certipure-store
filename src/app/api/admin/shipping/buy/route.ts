import { NextResponse } from 'next/server'
import { isAdminAuthenticated } from '@/lib/admin-auth'
import { buyLabel, shippoConfigured, shippoIsTestMode } from '@/lib/shippo'

export const dynamic = 'force-dynamic'

// Admin-only: buy the rate the admin selected. Returns the tracking number and
// a printable PDF label. This SPENDS REAL POSTAGE when a live token is in use,
// so it only ever runs from an explicit admin click — never automatically.
//
// The caller then marks the order shipped via /api/admin/update-order, which
// already saves tracking and emails the customer.
export async function POST(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!shippoConfigured()) {
    return NextResponse.json({ error: 'Shipping is not configured (missing SHIPPO_API_TOKEN).' }, { status: 503 })
  }

  const body = await request.json().catch(() => ({}))
  const rateId = typeof body?.rateId === 'string' ? body.rateId : ''
  if (!rateId) return NextResponse.json({ error: 'Pick a shipping option first.' }, { status: 400 })

  try {
    const label = await buyLabel(rateId)
    return NextResponse.json({ ok: true, ...label, testMode: shippoIsTestMode() })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Could not buy the label.' },
      { status: 502 },
    )
  }
}
