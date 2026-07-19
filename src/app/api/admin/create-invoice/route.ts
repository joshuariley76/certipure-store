import { NextResponse } from 'next/server'
import { isAdminAuthenticated } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { invoiceToken } from '@/lib/payriox'

export const dynamic = 'force-dynamic'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.certipure.net'
const FREE_SHIPPING_THRESHOLD = 300
const FLAT_SHIPPING = 12.99

function buildOrderNumber() {
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase()
  return `CP-INV-${rand}`
}

// Price per pack for a product + pack size, taken from the DB (never the client).
function pricePerPack(product: any, packSize: number): number | null {
  if (packSize === 1) return Number(product.price_single ?? product.price ?? 0) || null
  if (packSize === 3) return Number(product.price_3pack) || null
  if (packSize === 5) return Number(product.price_5pack) || null
  return null
}

// Admin-only: create an invoice (an order in status 'invoice') for a chosen set
// of products, and return a secure shareable pay link. The customer fills in
// shipping + pays on that link; no account required.
export async function POST(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const admin = createAdminClient()
  if (!admin) {
    return NextResponse.json({ error: 'Service role key not configured.' }, { status: 500 })
  }

  const body = await request.json().catch(() => ({}))
  const rawItems = Array.isArray(body?.items) ? body.items : []
  const customerEmail = typeof body?.customerEmail === 'string' ? body.customerEmail.trim() : ''
  const note = typeof body?.note === 'string' ? body.note.trim() : ''
  if (rawItems.length === 0) {
    return NextResponse.json({ error: 'Add at least one product.' }, { status: 400 })
  }

  // Validate + price every line from the database.
  const ids = [...new Set(rawItems.map((i: any) => i.product_id).filter(Boolean))]
  const { data: products, error: prodErr } = await admin
    .from('products')
    .select('id, name, price, price_single, price_3pack, price_5pack')
    .in('id', ids)
  if (prodErr) return NextResponse.json({ error: prodErr.message }, { status: 500 })
  const pmap = new Map((products || []).map((p: any) => [p.id, p]))

  const lineItems: any[] = []
  let subtotal = 0
  for (const raw of rawItems) {
    const product = pmap.get(raw.product_id)
    const packSize = Number(raw.pack_size)
    const quantity = Number(raw.quantity)
    if (!product || ![1, 3, 5].includes(packSize) || !Number.isInteger(quantity) || quantity < 1) {
      return NextResponse.json({ error: 'Each line needs a product, pack size (1/3/5) and a whole quantity.' }, { status: 400 })
    }
    // Optional per-line price override. The admin is authenticated (cookie), so
    // a custom price they type is trusted; otherwise fall back to the catalog.
    const ovRaw = raw.unit_price
    let ppp: number | null
    if (ovRaw != null && ovRaw !== '' && Number.isFinite(Number(ovRaw)) && Number(ovRaw) >= 0) {
      ppp = Number(ovRaw)
    } else {
      ppp = pricePerPack(product, packSize)
      if (ppp == null) {
        return NextResponse.json({ error: `No ${packSize}-pack price set for ${product.name} — set a custom $/pack for that line.` }, { status: 400 })
      }
    }
    const lineTotal = ppp * quantity
    subtotal += lineTotal
    lineItems.push({
      product_id: product.id,
      product_name_snapshot: product.name,
      pack_size: packSize,
      quantity,
      price_per_pack: ppp,
      line_total: lineTotal,
    })
  }

  // Shipping: optional admin override, else the usual free-over-$300 / flat rule.
  const shipRaw = body?.shipping
  const shipping = (shipRaw != null && shipRaw !== '' && Number.isFinite(Number(shipRaw)) && Number(shipRaw) >= 0)
    ? Number(shipRaw)
    : (subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : FLAT_SHIPPING)
  const orderTotal = subtotal + shipping

  const orderNumber = buildOrderNumber()
  const { data: order, error: orderErr } = await admin
    .from('orders')
    .insert({
      user_id: null,
      order_number: orderNumber,
      // 'pending_payment' = created but unpaid (an allowed status). Real customer
      // details + shipping are filled in when they pay via the link; these are
      // placeholders to satisfy NOT NULL columns until then.
      status: 'pending_payment',
      customer_name: 'Invoice — awaiting payment',
      customer_email: customerEmail || 'pending@certipure.net',
      shipping_address: {},
      payment_method: null,
      subtotal,
      shipping_cost: shipping,
      tax: 0,
      order_total: orderTotal,
      notes: note || null,
    })
    .select()
    .single()
  if (orderErr || !order) {
    return NextResponse.json({ error: `Could not create invoice: ${orderErr?.message || 'unknown'}` }, { status: 500 })
  }

  const withOrderId = lineItems.map((li) => ({ ...li, order_id: order.id }))
  const { error: itemsErr } = await admin.from('order_items').insert(withOrderId)
  if (itemsErr) {
    // roll back the order so we don't leave an empty invoice
    await admin.from('orders').delete().eq('id', order.id)
    return NextResponse.json({ error: `Could not add items: ${itemsErr.message}` }, { status: 500 })
  }

  const payUrl = `${SITE_URL}/invoice/${encodeURIComponent(orderNumber)}?t=${invoiceToken(orderNumber)}`
  return NextResponse.json({ ok: true, orderNumber, payUrl, orderTotal })
}
