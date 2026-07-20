import { NextResponse } from 'next/server'
import { isAdminAuthenticated } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { getRates, shippoConfigured, shippoIsTestMode } from '@/lib/shippo'

export const dynamic = 'force-dynamic'

// Admin-only: quote shipping rates for an order. Returns every buyable rate so
// the admin can review options and pick one before any money is spent.
export async function POST(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!shippoConfigured()) {
    return NextResponse.json({ error: 'Shipping is not configured (missing SHIPPO_API_TOKEN).' }, { status: 503 })
  }
  const admin = createAdminClient()
  if (!admin) return NextResponse.json({ error: 'Server not configured.' }, { status: 500 })

  const body = await request.json().catch(() => ({}))
  const orderId = typeof body?.orderId === 'string' ? body.orderId : ''
  if (!orderId) return NextResponse.json({ error: 'Missing order.' }, { status: 400 })

  const weightOz = Number(body?.weightOz)
  if (!Number.isFinite(weightOz) || weightOz <= 0) {
    return NextResponse.json({ error: 'Weight must be greater than 0 oz.' }, { status: 400 })
  }
  const length = String(body?.length || '6')
  const width = String(body?.width || '9')
  const height = String(body?.height || '2')

  const { data: order, error } = await admin
    .from('orders')
    .select('id, order_number, customer_name, customer_email, customer_phone, shipping_address')
    .eq('id', orderId)
    .single()
  if (error || !order) return NextResponse.json({ error: 'Order not found.' }, { status: 404 })

  const a = (order.shipping_address || {}) as any
  if (!a.line1 || !a.city || !a.state || !a.zip) {
    return NextResponse.json({ error: 'This order has no complete shipping address.' }, { status: 400 })
  }

  try {
    const rates = await getRates(
      {
        name: order.customer_name || 'Customer',
        street1: a.line1,
        street2: a.line2 || undefined,
        city: a.city,
        state: a.state,
        zip: a.zip,
        country: a.country || 'US',
        email: order.customer_email || undefined,
        phone: order.customer_phone || undefined,
      },
      { length, width, height, weightOz: String(weightOz) },
    )
    return NextResponse.json({ ok: true, rates, testMode: shippoIsTestMode() })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Could not get rates.' }, { status: 502 })
  }
}
